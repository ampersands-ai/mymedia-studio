/**
 * OutputProcessor - Independent module for processing generation outputs
 * 
 * This class encapsulates ALL output processing logic:
 * - Realtime subscription for instant updates
 * - Polling fallback for reliability
 * - Parent/child generation handling
 * - Stall detection and recovery
 * 
 * Architecture: Single responsibility, no external hook dependencies
 */

import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { getModel } from "@/lib/models/registry";
import {
  POLLING_INTERVAL_MS,
  POLLING_MAX_ATTEMPTS,
  REALTIME_FALLBACK_DELAY_MS,
  STALL_DETECTION_TIMEOUT_MS,
  CHILD_FETCH_DELAY_MS,
  CHILD_RETRY_DELAY_MS,
  TERMINAL_STATUSES,
  REALTIME_CHANNEL_PREFIX,
} from "./constants";
import type {
  ProcessorConfig,
  ProcessorStatus,
  GenerationOutput,
  GenerationRecord,
  ChildGenerationRecord,
} from "./types";
import type { RealtimeChannel } from "@supabase/supabase-js";

export class OutputProcessor {
  private config: ProcessorConfig;
  private status: ProcessorStatus = 'idle';
  private channel: RealtimeChannel | null = null;
  private pollingTimer: NodeJS.Timeout | null = null;
  private stallTimer: NodeJS.Timeout | null = null;
  private fallbackTimer: NodeJS.Timeout | null = null;
  private pollAttempts = 0;
  private isProcessing = false;
  private hasCompleted = false;

  constructor(config: ProcessorConfig) {
    this.config = config;
    logger.info('[OutputProcessor] Created', { 
      generationId: config.generationId,
      userId: config.userId 
    } as any);
  }

  /**
   * Start processing - sets up realtime subscription and polling fallback
   */
  async start(): Promise<void> {
    if (this.status !== 'idle') {
      logger.warn('[OutputProcessor] Already started', { status: this.status } as any);
      return;
    }

    logger.info('[OutputProcessor] Starting', { generationId: this.config.generationId } as any);
    this.setStatus('connecting');

    // 1. Immediate status check - generation might already be complete
    const immediateResult = await this.checkAndProcess();
    if (immediateResult) {
      logger.info('[OutputProcessor] Generation already complete on start', { 
        generationId: this.config.generationId 
      } as any);
      return;
    }

    // 2. Set up realtime subscription
    this.setupRealtimeSubscription();

    // 3. Set fallback timer for polling
    this.fallbackTimer = setTimeout(() => {
      if (this.status === 'connecting') {
        logger.warn('[OutputProcessor] Realtime connection timeout, falling back to polling', {
          generationId: this.config.generationId
        } as any);
        this.startPolling();
      }
    }, REALTIME_FALLBACK_DELAY_MS);

    // 4. Set up stall detection
    this.startStallDetection();
  }

  /**
   * Stop processing - clean up all resources
   */
  stop(): void {
    logger.info('[OutputProcessor] Stopping', { generationId: this.config.generationId } as any);
    
    this.clearTimers();
    this.unsubscribeRealtime();
    this.setStatus('idle');
    this.hasCompleted = false;
    this.isProcessing = false;
    this.pollAttempts = 0;
  }

  /**
   * Get current status
   */
  getStatus(): ProcessorStatus {
    return this.status;
  }

  // ============ Private Methods ============

  private setStatus(status: ProcessorStatus): void {
    this.status = status;
    this.config.onStatusChange?.(status);
    logger.debug('[OutputProcessor] Status changed', { status, generationId: this.config.generationId } as any);
  }

  private clearTimers(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
    if (this.stallTimer) {
      clearTimeout(this.stallTimer);
      this.stallTimer = null;
    }
    if (this.fallbackTimer) {
      clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }
  }

  /**
   * Set up Supabase realtime subscription for generation updates
   */
  private setupRealtimeSubscription(): void {
    const channelName = `${REALTIME_CHANNEL_PREFIX}-${this.config.generationId}`;
    
    logger.info('[OutputProcessor] Setting up realtime subscription', { 
      channelName,
      generationId: this.config.generationId 
    } as any);

    this.channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'generations',
          filter: `id=eq.${this.config.generationId}`,
        },
        (payload) => {
          logger.info('[OutputProcessor] Realtime update received (parent)', { 
            generationId: this.config.generationId,
            newStatus: (payload.new as GenerationRecord).status 
          } as any);
          this.handleRealtimeUpdate(payload.new as GenerationRecord);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'generations',
          filter: `parent_generation_id=eq.${this.config.generationId}`,
        },
        (payload) => {
          logger.info('[OutputProcessor] Realtime update received (child)', { 
            generationId: this.config.generationId,
            childId: (payload.new as GenerationRecord).id,
            childStatus: (payload.new as GenerationRecord).status,
            hasStoragePath: !!(payload.new as GenerationRecord).storage_path
          } as any);
          // Child update - check if we should process
          if ((payload.new as GenerationRecord).storage_path) {
            this.resetStallDetection();
            this.checkAndProcess();
          }
        }
      )
      .subscribe((status) => {
        logger.info('[OutputProcessor] Realtime subscription status', { 
          status,
          generationId: this.config.generationId 
        } as any);
        
        if (status === 'SUBSCRIBED') {
          this.setStatus('realtime');
          // Clear fallback timer since realtime is connected
          if (this.fallbackTimer) {
            clearTimeout(this.fallbackTimer);
            this.fallbackTimer = null;
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          logger.warn('[OutputProcessor] Realtime subscription error', { 
            status,
            generationId: this.config.generationId 
          } as any);
          this.startPolling();
        }
      });
  }

  private unsubscribeRealtime(): void {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }

  /**
   * Handle realtime update from Supabase
   */
  private handleRealtimeUpdate(record: GenerationRecord): void {
    this.resetStallDetection();

    if (TERMINAL_STATUSES.includes(record.status as typeof TERMINAL_STATUSES[number])) {
      this.checkAndProcess();
    }
  }

  /**
   * Start polling fallback
   */
  private startPolling(): void {
    if (this.pollingTimer) {
      return; // Already polling
    }

    logger.info('[OutputProcessor] Starting polling fallback', { 
      generationId: this.config.generationId 
    } as any);
    
    this.setStatus('polling');
    this.pollAttempts = 0;

    this.pollingTimer = setInterval(() => {
      this.pollAttempts++;
      
      if (this.pollAttempts >= POLLING_MAX_ATTEMPTS) {
        logger.error('[OutputProcessor] Max polling attempts reached', { 
          generationId: this.config.generationId,
          attempts: this.pollAttempts 
        } as any);
        this.stop();
        this.config.onError('Generation timed out');
        return;
      }

      this.checkAndProcess();
    }, POLLING_INTERVAL_MS);
  }

  /**
   * Start stall detection timer
   */
  private startStallDetection(): void {
    this.stallTimer = setTimeout(() => {
      logger.warn('[OutputProcessor] Stall detected, forcing polling', { 
        generationId: this.config.generationId 
      } as any);
      this.startPolling();
    }, STALL_DETECTION_TIMEOUT_MS);
  }

  /**
   * Reset stall detection timer
   */
  private resetStallDetection(): void {
    if (this.stallTimer) {
      clearTimeout(this.stallTimer);
    }
    this.startStallDetection();
  }

  /**
   * Check generation status and process if complete
   * Returns true if processing was completed
   */
  private async checkAndProcess(): Promise<boolean> {
    if (this.isProcessing || this.hasCompleted) {
      return false;
    }

    this.isProcessing = true;

    try {
      const outputs = await this.fetchGenerationOutputs();
      
      if (outputs && outputs.length > 0) {
        logger.info('[OutputProcessor] Outputs fetched successfully', { 
          generationId: this.config.generationId,
          outputCount: outputs.length,
          outputs: outputs.map(o => ({ id: o.id, path: o.storage_path }))
        } as any);
        
        this.hasCompleted = true;
        this.setStatus('completed');
        this.clearTimers();
        this.unsubscribeRealtime();
        
        this.config.onOutputs(outputs, this.config.generationId);
        return true;
      }

      return false;
    } catch (error) {
      logger.error('[OutputProcessor] Error checking generation', error as Error, { 
        generationId: this.config.generationId 
      });
      return false;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Fetch generation outputs from database
   * Handles both parent and child generations
   */
  private async fetchGenerationOutputs(): Promise<GenerationOutput[] | null> {
    // Fetch parent generation
    const { data: parent, error: parentError } = await supabase
      .from('generations')
      .select('id, status, storage_path, type, created_at, provider_task_id, model_id, model_record_id, provider_response, is_batch_output, user_id')
      .eq('id', this.config.generationId)
      .single();

    if (parentError) {
      logger.error('[OutputProcessor] Failed to fetch parent', parentError, { 
        generationId: this.config.generationId 
      });
      return null;
    }

    if (!parent) {
      logger.error('[OutputProcessor] Parent not found', new Error('Not found'), { 
        generationId: this.config.generationId 
      });
      return null;
    }

    logger.debug('[OutputProcessor] Parent fetched', {
      generationId: this.config.generationId,
      status: parent.status,
      hasStoragePath: !!parent.storage_path,
      isBatchOutput: parent.is_batch_output
    } as any);

    // Handle failed/error status
    if (parent.status === 'failed' || parent.status === 'error') {
      const pr = (parent.provider_response || {}) as Record<string, unknown>;
      const errorObj = pr.error as { message?: string } | undefined;
      const detailed = pr.error || pr.message || pr.error_message || pr.detail || errorObj?.message;
      const errorMsg = detailed ? String(detailed) : `Generation ${parent.status}`;
      
      this.hasCompleted = true;
      this.setStatus('error');
      this.clearTimers();
      this.config.onError(errorMsg);
      return null;
    }

    // If not completed yet, return null to continue polling
    if (parent.status !== 'completed') {
      // Check for children with storage_path even if parent not completed (race condition handling)
      if (parent.status === 'processing') {
        const { data: existingChildren } = await supabase
          .from('generations')
          .select('id, storage_path, status')
          .eq('parent_generation_id', this.config.generationId)
          .not('storage_path', 'is', null)
          .eq('status', 'completed')
          .limit(1);

        if (existingChildren && existingChildren.length > 0) {
          logger.info('[OutputProcessor] Children exist but parent not completed, will retry', { 
            generationId: this.config.generationId,
            childId: existingChildren[0].id 
          } as any);
        }
      }
      return null;
    }

    // Parent is completed - fetch outputs
    return this.buildOutputsFromParent(parent as GenerationRecord);
  }

  /**
   * Build output array from parent and child generations
   */
  private async buildOutputsFromParent(parent: GenerationRecord): Promise<GenerationOutput[]> {
    const outputs: GenerationOutput[] = [];

    // Get provider from registry for parent
    let parentProvider = '';
    if (parent.model_record_id) {
      try {
        const model = getModel(parent.model_record_id);
        parentProvider = model.MODEL_CONFIG.provider;
      } catch (e) {
        logger.warn('[OutputProcessor] Failed to get provider from registry', { 
          modelRecordId: parent.model_record_id 
        } as any);
      }
    }

    // Small delay to ensure children are committed
    await new Promise(resolve => setTimeout(resolve, CHILD_FETCH_DELAY_MS));

    // Fetch child generations
    const { data: children, error: childrenError } = await supabase
      .from('generations')
      .select('id, storage_path, output_index, provider_task_id, model_id, model_record_id, status')
      .eq('parent_generation_id', parent.id)
      .eq('status', 'completed')
      .order('output_index');

    if (childrenError) {
      logger.error('[OutputProcessor] Failed to fetch children', childrenError, { 
        parentId: parent.id 
      });
    }

    logger.info('[OutputProcessor] Children fetched', {
      parentId: parent.id,
      childrenCount: children?.length || 0,
      children: children?.map((c: ChildGenerationRecord) => ({ 
        id: c.id, 
        hasPath: !!c.storage_path, 
        index: c.output_index 
      }))
    } as any);

    // Add child generations
    if (children && children.length > 0) {
      const childrenWithStorage = children.filter((c: ChildGenerationRecord) => c.storage_path);
      
      for (const child of childrenWithStorage) {
        if (!child.model_record_id) continue;

        let childProvider = '';
        try {
          const model = getModel(child.model_record_id);
          childProvider = model.MODEL_CONFIG.provider;
        } catch (e) {
          // Ignore
        }

        outputs.push({
          id: child.id,
          storage_path: child.storage_path!,
          type: parent.type,
          output_index: child.output_index || 0,
          provider_task_id: child.provider_task_id || '',
          model_id: child.model_id || '',
          provider: childProvider,
        });
      }
    } else if (parent.is_batch_output) {
      // Retry once for batch outputs
      logger.warn('[OutputProcessor] No children found for batch output, retrying...', { 
        parentId: parent.id 
      } as any);
      
      await new Promise(resolve => setTimeout(resolve, CHILD_RETRY_DELAY_MS));

      const { data: retryChildren } = await supabase
        .from('generations')
        .select('id, storage_path, output_index, provider_task_id, model_id, model_record_id, status')
        .eq('parent_generation_id', parent.id)
        .eq('status', 'completed')
        .order('output_index');

      if (retryChildren && retryChildren.length > 0) {
        const retryWithStorage = (retryChildren as ChildGenerationRecord[]).filter((c) => c.storage_path);
        
        for (const child of retryWithStorage) {
          if (!child.model_record_id) continue;

          let childProvider = '';
          try {
            const model = getModel(child.model_record_id);
            childProvider = model.MODEL_CONFIG.provider;
          } catch (e) {
            // Ignore
          }

          outputs.push({
            id: child.id,
            storage_path: child.storage_path!,
            type: parent.type,
            output_index: child.output_index || 0,
            provider_task_id: child.provider_task_id || '',
            model_id: child.model_id || '',
            provider: childProvider,
          });
        }
      }
    }

    // Add parent if it has output (single output models)
    if (parent.storage_path) {
      outputs.push({
        id: parent.id,
        storage_path: parent.storage_path,
        type: parent.type,
        output_index: 0,
        provider_task_id: parent.provider_task_id || '',
        model_id: parent.model_id || '',
        provider: parentProvider,
      });
    }

    logger.info('[OutputProcessor] Final outputs built', {
      parentId: parent.id,
      totalOutputs: outputs.length,
      outputIds: outputs.map(o => o.id)
    } as any);

    return outputs;
  }
}
