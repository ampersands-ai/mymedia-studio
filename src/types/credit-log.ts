/**
 * Credit Activity Log Types
 */

export type CreditStatus = 
  | 'charged' 
  | 'refunded' 
  | 'pending_refund' 
  | 'reserved' 
  | 'dispute_rejected'
  | 'failed';

export interface CreditLogEntry {
  id: string;
  date: Date;
  prompt: string;
  modelType: string;      // "Text to Image", "Image Editing", etc.
  modelName: string;      // "ChatGPT 4o Image"
  modelVersion: string;   // variantName
  creditsReserved: number;
  creditsCharged: number;
  creditStatus: CreditStatus;
  refundAmount: number;
  generationStatus: string;
  hasDispute: boolean;
  disputeStatus?: string;
  cumulativeBalance?: number; // Running balance after this transaction
}
