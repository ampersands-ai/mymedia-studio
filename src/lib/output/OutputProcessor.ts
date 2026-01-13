/**
 * OutputProcessor - Legacy class (kept for backwards compatibility)
 * 
 * Note: The useOutputProcessor hook now handles all output processing
 * with direct database polling. This class is kept for any code that
 * may still reference it directly.
 * 
 * @deprecated Use useOutputProcessor hook instead
 */

import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { getModel } from "@/lib/models/registry";
import { POLLING_INTERVAL_FAST_MS, MAX_POLLING_DURATION_MS, TERMINAL_STATUSES } from "./constants";
import type { ProcessorConfig, ProcessorStatus, GenerationOutput, ChildGenerationRecord } from "./types";

export class OutputProcessor {
  private config: ProcessorConfig;
  private status: ProcessorStatus = 'idle';
  private pollingTimer: NodeJS.Timeout | null = null;
  private pollingStartTime = 0;
  private hasCompleted = false;

  constructor(config: ProcessorConfig) {
    this.config = config;
    logger.info('[OutputProcessor] Created', { generationId: config.generationId } as any);
  }

  async start(): Promise<void> {
    if (this.status !== 'idle') return;

    logger.info('[OutputProcessor] Starting', { generationId: this.config.generationId } as any);
    this.setStatus('polling');
    this.pollingStartTime = Date.now();
    this.hasCompleted = false;

    // Immediate first check, then schedule next
    await this.checkAndProcess();
    this.scheduleNextPoll();
  }

  private scheduleNextPoll(): void {
    if (this.hasCompleted) return;
    
    const elapsed = Date.now() - this.pollingStartTime;
    if (elapsed >= MAX_POLLING_DURATION_MS) {
      // Graceful timeout - don't treat as error, just stop polling
      // Generation continues in background
      logger.info('[OutputProcessor] Max polling duration reached, transitioning to background');
      this.stop();
      // Don't call onError - this is not a failure
      return;
    }
    
    this.pollingTimer = setTimeout(() => {
      this.checkAndProcess().then(() => this.scheduleNextPoll());
    }, POLLING_INTERVAL_FAST_MS);
  }

  stop(): void {
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = null;
    }
    this.setStatus('idle');
    this.hasCompleted = false;
    this.pollingStartTime = 0;
  }

  getStatus(): ProcessorStatus {
    return this.status;
  }

  private setStatus(status: ProcessorStatus): void {
    this.status = status;
    this.config.onStatusChange?.(status);
  }

  private async checkAndProcess(): Promise<boolean> {
    if (this.hasCompleted) return false;

    try {
      const outputs = await this.fetchOutputs();
      if (outputs && outputs.length > 0) {
        this.hasCompleted = true;
        this.setStatus('completed');
        this.stop();
        this.config.onOutputs(outputs, this.config.generationId);
        return true;
      }
      return false;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.hasCompleted = true;
      this.setStatus('error');
      this.stop();
      this.config.onError(errorMsg);
      return false;
    }
  }

  private async fetchOutputs(): Promise<GenerationOutput[] | null> {
    const { data: parent, error: parentError } = await supabase
      .from('generations')
      .select('id, status, storage_path, type, model_id, model_record_id, provider_response, is_batch_output')
      .eq('id', this.config.generationId)
      .single();

    if (parentError || !parent) {
      logger.error('[OutputProcessor] Failed to fetch parent', parentError);
      return null;
    }

    if (parent.status === 'failed' || parent.status === 'error') {
      const pr = (parent.provider_response || {}) as Record<string, unknown>;
      const errorObj = pr.error as { message?: string } | undefined;
      const detailed = pr.error || pr.message || pr.error_message || pr.detail || errorObj?.message;
      throw new Error(detailed ? String(detailed) : `Generation ${parent.status}`);
    }

    if (!TERMINAL_STATUSES.includes(parent.status as typeof TERMINAL_STATUSES[number])) {
      return null;
    }

    const { data: children } = await supabase
      .from('generations')
      .select('id, storage_path, output_index, provider_task_id, model_id, model_record_id, status')
      .eq('parent_generation_id', parent.id)
      .eq('status', 'completed')
      .not('storage_path', 'is', null)
      .order('output_index');

    const outputs: GenerationOutput[] = [];

    if (children && children.length > 0) {
      for (const child of children as ChildGenerationRecord[]) {
        if (!child.storage_path || !child.model_record_id) continue;
        let provider = '';
        try {
          const model = getModel(child.model_record_id);
          provider = model.MODEL_CONFIG.provider;
        } catch {
          // Ignore
        }
        outputs.push({
          id: child.id,
          storage_path: child.storage_path,
          type: parent.type,
          output_index: child.output_index || 0,
          provider_task_id: child.provider_task_id || '',
          model_id: child.model_id || '',
          provider,
        });
      }
    }

    if (outputs.length === 0 && parent.storage_path) {
      let provider = '';
      if (parent.model_record_id) {
        try {
          const model = getModel(parent.model_record_id);
          provider = model.MODEL_CONFIG.provider;
        } catch {
          // Ignore
        }
      }
      outputs.push({
        id: parent.id,
        storage_path: parent.storage_path,
        type: parent.type,
        output_index: 0,
        model_id: parent.model_id || '',
        provider,
      });
    }

    return outputs.length > 0 ? outputs : null;
  }
}
