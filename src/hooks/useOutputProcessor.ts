/**
 * useOutputProcessor - React hook wrapper for OutputProcessor
 * 
 * Provides a simple interface for components to monitor generation outputs
 * without dealing with realtime subscriptions or polling logic directly.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";
import { OutputProcessor } from "@/lib/output/OutputProcessor";
import type { GenerationOutput, ProcessorStatus } from "@/lib/output/types";

interface UseOutputProcessorOptions {
  onComplete?: (outputs: GenerationOutput[], parentId: string) => void;
  onError?: (error: string) => void;
}

interface UseOutputProcessorReturn {
  outputs: GenerationOutput[];
  isProcessing: boolean;
  status: ProcessorStatus;
  error: string | null;
  startProcessing: (generationId: string) => void;
  stopProcessing: () => void;
}

export const useOutputProcessor = (options: UseOutputProcessorOptions = {}): UseOutputProcessorReturn => {
  const { user } = useAuth();
  const [outputs, setOutputs] = useState<GenerationOutput[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<ProcessorStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  
  const processorRef = useRef<OutputProcessor | null>(null);
  const optionsRef = useRef(options);

  // Keep options ref updated
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const startProcessing = useCallback((generationId: string) => {
    if (!user?.id) {
      logger.error('[useOutputProcessor] Cannot start: no user ID');
      setError('User not authenticated');
      return;
    }

    // Clean up existing processor
    if (processorRef.current) {
      processorRef.current.stop();
    }

    logger.info('[useOutputProcessor] Starting processing', { generationId, userId: user.id } as any);
    
    // Reset state
    setOutputs([]);
    setError(null);
    setIsProcessing(true);
    setStatus('connecting');

    // Create new processor
    processorRef.current = new OutputProcessor({
      userId: user.id,
      generationId,
      onOutputs: (newOutputs, parentId) => {
        logger.info('[useOutputProcessor] Outputs received', { 
          outputCount: newOutputs.length,
          parentId 
        } as any);
        
        setOutputs(newOutputs);
        setIsProcessing(false);
        setStatus('completed');
        
        // Call external callback
        optionsRef.current.onComplete?.(newOutputs, parentId);
      },
      onError: (errorMsg) => {
        logger.error('[useOutputProcessor] Error received', { error: errorMsg } as any);
        
        setError(errorMsg);
        setIsProcessing(false);
        setStatus('error');
        
        // Call external callback
        optionsRef.current.onError?.(errorMsg);
      },
      onStatusChange: (newStatus) => {
        setStatus(newStatus);
      },
    });

    // Start processing
    processorRef.current.start();
  }, [user?.id]);

  const stopProcessing = useCallback(() => {
    logger.info('[useOutputProcessor] Stopping processing');
    
    if (processorRef.current) {
      processorRef.current.stop();
      processorRef.current = null;
    }
    
    setIsProcessing(false);
    setStatus('idle');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (processorRef.current) {
        processorRef.current.stop();
        processorRef.current = null;
      }
    };
  }, []);

  return {
    outputs,
    isProcessing,
    status,
    error,
    startProcessing,
    stopProcessing,
  };
};
