/**
 * Tests for CreditStatusBadge component
 * Ensures credit status display with correct colors and icons
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CreditStatusBadge } from '../CreditStatusBadge';
import type { CreditStatus } from '@/types/credit-log';

describe('CreditStatusBadge', () => {
  describe('Status Display', () => {
    it('displays charged status with correct label', () => {
      render(<CreditStatusBadge status="charged" amount={10.5} />);

      expect(screen.getByText('Charged')).toBeInTheDocument();
      expect(screen.getByText('10.50')).toBeInTheDocument();
    });

    it('displays refunded status with correct label', () => {
      render(<CreditStatusBadge status="refunded" amount={5.25} />);

      expect(screen.getByText('Refunded')).toBeInTheDocument();
      expect(screen.getByText('5.25')).toBeInTheDocument();
    });

    it('displays pending_refund status with correct label', () => {
      render(<CreditStatusBadge status="pending_refund" amount={3.0} />);

      expect(screen.getByText('Pending Refund')).toBeInTheDocument();
      expect(screen.getByText('3.00')).toBeInTheDocument();
    });

    it('displays reserved status with correct label', () => {
      render(<CreditStatusBadge status="reserved" amount={2.5} />);

      expect(screen.getByText('Reserved')).toBeInTheDocument();
      expect(screen.getByText('2.50')).toBeInTheDocument();
    });

    it('displays dispute_rejected status with correct label', () => {
      render(<CreditStatusBadge status="dispute_rejected" amount={15.0} />);

      expect(screen.getByText('Dispute Rejected')).toBeInTheDocument();
      expect(screen.getByText('15.00')).toBeInTheDocument();
    });

    it('displays failed status with correct label', () => {
      render(<CreditStatusBadge status="failed" amount={7.75} />);

      expect(screen.getByText('Failed')).toBeInTheDocument();
      expect(screen.getByText('7.75')).toBeInTheDocument();
    });
  });

  describe('Amount Formatting', () => {
    it('formats whole numbers to 2 decimal places', () => {
      render(<CreditStatusBadge status="charged" amount={5} />);

      expect(screen.getByText('5.00')).toBeInTheDocument();
    });

    it('formats decimal amounts to 2 decimal places', () => {
      render(<CreditStatusBadge status="charged" amount={10.5} />);

      expect(screen.getByText('10.50')).toBeInTheDocument();
    });

    it('rounds to 2 decimal places', () => {
      render(<CreditStatusBadge status="charged" amount={3.456} />);

      expect(screen.getByText('3.46')).toBeInTheDocument();
    });

    it('formats zero correctly', () => {
      render(<CreditStatusBadge status="failed" amount={0} />);

      expect(screen.getByText('0.00')).toBeInTheDocument();
    });
  });

  describe('Show/Hide Amount', () => {
    it('shows amount by default', () => {
      render(<CreditStatusBadge status="charged" amount={10.5} />);

      expect(screen.getByText('10.50')).toBeInTheDocument();
      expect(screen.getByText('Charged')).toBeInTheDocument();
    });

    it('hides amount when showAmount is false', () => {
      render(<CreditStatusBadge status="charged" amount={10.5} showAmount={false} />);

      expect(screen.queryByText('10.50')).not.toBeInTheDocument();
      expect(screen.getByText('Charged')).toBeInTheDocument();
    });

    it('shows amount when showAmount is explicitly true', () => {
      render(<CreditStatusBadge status="refunded" amount={5.25} showAmount={true} />);

      expect(screen.getByText('5.25')).toBeInTheDocument();
    });
  });

  describe('Styling Classes', () => {
    it('applies emerald styling for charged status', () => {
      render(<CreditStatusBadge status="charged" amount={10} />);

      const badge = screen.getByText('Charged').parentElement;
      expect(badge?.className).toContain('bg-emerald-500/20');
      expect(badge?.className).toContain('text-emerald-400');
    });

    it('applies destructive styling for failed status', () => {
      render(<CreditStatusBadge status="failed" amount={10} />);

      const badge = screen.getByText('Failed').parentElement;
      expect(badge?.className).toContain('bg-destructive/20');
      expect(badge?.className).toContain('text-destructive');
    });

    it('applies amber styling for pending_refund status', () => {
      render(<CreditStatusBadge status="pending_refund" amount={10} />);

      const badge = screen.getByText('Pending Refund').parentElement;
      expect(badge?.className).toContain('bg-amber-500/20');
      expect(badge?.className).toContain('text-amber-400');
    });

    it('applies blue styling for reserved status', () => {
      render(<CreditStatusBadge status="reserved" amount={10} />);

      const badge = screen.getByText('Reserved').parentElement;
      expect(badge?.className).toContain('bg-blue-500/20');
      expect(badge?.className).toContain('text-blue-400');
    });
  });

  describe('Edge Cases', () => {
    it('handles very large amounts', () => {
      render(<CreditStatusBadge status="charged" amount={999999.99} />);

      expect(screen.getByText('999999.99')).toBeInTheDocument();
    });

    it('handles very small amounts', () => {
      render(<CreditStatusBadge status="charged" amount={0.01} />);

      expect(screen.getByText('0.01')).toBeInTheDocument();
    });

    it('handles negative amounts (edge case)', () => {
      render(<CreditStatusBadge status="refunded" amount={-5.5} />);

      expect(screen.getByText('-5.50')).toBeInTheDocument();
    });
  });

  describe('All Status Types', () => {
    const statuses: CreditStatus[] = [
      'charged',
      'refunded',
      'pending_refund',
      'reserved',
      'dispute_rejected',
      'failed',
    ];

    statuses.forEach(status => {
      it(`renders ${status} status without crashing`, () => {
        render(<CreditStatusBadge status={status} amount={10} />);

        // Just verify it renders without errors
        const badge = screen.getByText(/charged|refunded|pending|reserved|dispute|failed/i);
        expect(badge).toBeInTheDocument();
      });
    });
  });
});
