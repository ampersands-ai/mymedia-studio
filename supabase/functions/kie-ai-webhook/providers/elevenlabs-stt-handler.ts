/**
 * ElevenLabs Speech-to-Text Handler
 * 
 * Processes transcription results from webhook callbacks.
 * Follows the same architectural pattern as suno-handler.ts and midjourney-handler.ts
 */

import { webhookLogger } from "../../_shared/logger.ts";

/**
 * Transcription result structure from ElevenLabs STT
 */
export interface TranscriptionResult {
  text: string;
  words?: Array<{
    word: string;
    start: number;
    end: number;
    speaker?: string;
  }>;
  audioEvents?: Array<{
    event: string;
    start: number;
    end: number;
  }>;
  language?: string;
  languageCode?: string;
  confidence?: number;
}

/**
 * Detect if this is a Speech-to-Text model
 */
export function isSpeechToTextModel(modelId?: string): boolean {
  if (!modelId) return false;
  const id = modelId.toLowerCase();
  return (
    id.includes('speech-to-text') ||
    id.includes('speech_to_text') ||
    id.includes('stt') ||
    id.includes('scribe') ||
    id.includes('transcription') ||
    id.includes('transcribe')
  );
}

/**
 * Extract transcription from various webhook payload formats
 * 
 * Supports multiple formats:
 * 1. resultJson with text/transcription field
 * 2. payload.data.info with transcription data
 * 3. payload.data with direct transcription
 * 4. ElevenLabs specific format with words and audio_events
 */
export function extractTranscription(
  payload: Record<string, unknown>, 
  resultJson: string | null
): TranscriptionResult | null {
  // Try resultJson first (most common KIE.AI format)
  if (resultJson) {
    try {
      const parsed = JSON.parse(resultJson);
      const text = parsed?.text || parsed?.transcription || parsed?.transcript;
      if (text && typeof text === 'string') {
        webhookLogger.info('[STT] Extracted transcription from resultJson', {
          metadata: { textLength: text.length, hasWords: !!parsed?.words }
        });
        return {
          text,
          words: parsed.words,
          audioEvents: parsed.audio_events || parsed.audioEvents,
          language: parsed.language || parsed.detected_language,
          languageCode: parsed.language_code || parsed.languageCode,
          confidence: parsed.confidence
        };
      }
    } catch (e) {
      webhookLogger.info('[STT] Failed to parse resultJson', { 
        metadata: { error: e instanceof Error ? e.message : String(e) } 
      });
    }
  }

  // Try payload.data.info (new format)
  const data = payload.data as Record<string, unknown> | undefined;
  const info = data?.info as Record<string, unknown> | undefined;
  
  if (info) {
    const text = info.text || info.transcription || info.transcript;
    if (text && typeof text === 'string') {
      webhookLogger.info('[STT] Extracted transcription from data.info', {
        metadata: { textLength: (text as string).length }
      });
      return {
        text: text as string,
        words: info.words as TranscriptionResult['words'],
        audioEvents: (info.audio_events || info.audioEvents) as TranscriptionResult['audioEvents'],
        language: info.language as string,
        languageCode: (info.language_code || info.languageCode) as string,
        confidence: info.confidence as number
      };
    }
  }

  // Try payload.data directly
  if (data) {
    const text = data.text || data.transcription || data.transcript;
    if (text && typeof text === 'string') {
      webhookLogger.info('[STT] Extracted transcription from data', {
        metadata: { textLength: (text as string).length }
      });
      return {
        text: text as string,
        words: data.words as TranscriptionResult['words'],
        audioEvents: (data.audio_events || data.audioEvents) as TranscriptionResult['audioEvents'],
        language: data.language as string,
        languageCode: (data.language_code || data.languageCode) as string,
        confidence: data.confidence as number
      };
    }
  }

  // Try nested data.data (some API formats)
  const nestedData = data?.data as Record<string, unknown> | undefined;
  if (nestedData) {
    const text = nestedData.text || nestedData.transcription || nestedData.transcript;
    if (text && typeof text === 'string') {
      webhookLogger.info('[STT] Extracted transcription from nested data.data', {
        metadata: { textLength: (text as string).length }
      });
      return {
        text: text as string,
        words: nestedData.words as TranscriptionResult['words'],
        audioEvents: (nestedData.audio_events || nestedData.audioEvents) as TranscriptionResult['audioEvents'],
        language: nestedData.language as string,
        languageCode: (nestedData.language_code || nestedData.languageCode) as string,
        confidence: nestedData.confidence as number
      };
    }
  }

  webhookLogger.info('[STT] No transcription found in any known format');
  return null;
}

/**
 * Check if webhook payload contains transcription results
 */
export function hasTranscriptionResults(
  payload: Record<string, unknown>, 
  resultJson: string | null
): boolean {
  return extractTranscription(payload, resultJson) !== null;
}

/**
 * Format transcription result for storage
 * Creates a normalized structure for consistent storage and retrieval
 */
export function formatTranscriptionForStorage(
  transcription: TranscriptionResult,
  payload: Record<string, unknown>,
  kieCredits?: { consumed?: number; remaining?: number }
): Record<string, unknown> {
  return {
    // Primary transcription data
    text: transcription.text,
    transcription: transcription.text, // Duplicate for compatibility
    
    // Word-level timestamps (if available)
    words: transcription.words || [],
    
    // Audio events like laughter, music, etc. (if available)
    audio_events: transcription.audioEvents || [],
    
    // Language detection
    language: transcription.language,
    language_code: transcription.languageCode,
    
    // Confidence score
    confidence: transcription.confidence,
    
    // Credit information
    kie_credits_consumed: kieCredits?.consumed ?? null,
    kie_credits_remaining: kieCredits?.remaining ?? null,
    
    // Raw payload for debugging
    raw_callback: payload,
    
    // Timestamp
    timestamp: new Date().toISOString()
  };
}
