import { describe, it, expect } from 'vitest';
import {
  isDisposableEmail,
  normalizeGmailDots,
  getCanonicalEmail,
  validateEmailAdvanced,
} from '../email-validation';

describe('email-validation', () => {
  describe('isDisposableEmail', () => {
    it('detects common disposable email domains', () => {
      const disposableEmails = [
        'user@mailinator.com',
        'test@guerrillamail.com',
        'temp@10minutemail.com',
        'fake@yopmail.com',
        'spam@tempmail.com',
        'throw@throwaway.email',
        'trash@trashmail.com',
        'nada@getnada.com',
      ];
      
      disposableEmails.forEach(email => {
        expect(isDisposableEmail(email)).toBe(true);
      });
    });

    it('allows legitimate email domains', () => {
      const legitimateEmails = [
        'user@gmail.com',
        'user@yahoo.com',
        'user@outlook.com',
        'user@company.com',
        'user@university.edu',
        'user@protonmail.com',
      ];
      
      legitimateEmails.forEach(email => {
        expect(isDisposableEmail(email)).toBe(false);
      });
    });

    it('handles edge cases', () => {
      expect(isDisposableEmail('')).toBe(false);
      expect(isDisposableEmail('invalid')).toBe(false);
      expect(isDisposableEmail('@nodomain')).toBe(false);
    });

    it('is case insensitive', () => {
      expect(isDisposableEmail('USER@MAILINATOR.COM')).toBe(true);
      expect(isDisposableEmail('User@Mailinator.Com')).toBe(true);
    });
  });

  describe('normalizeGmailDots', () => {
    it('removes dots from Gmail addresses', () => {
      expect(normalizeGmailDots('j.o.h.n@gmail.com')).toBe('john@gmail.com');
      expect(normalizeGmailDots('john.doe@gmail.com')).toBe('johndoe@gmail.com');
      expect(normalizeGmailDots('a.b.c.d@gmail.com')).toBe('abcd@gmail.com');
    });

    it('removes + aliases from Gmail', () => {
      expect(normalizeGmailDots('john+tag@gmail.com')).toBe('john@gmail.com');
      expect(normalizeGmailDots('john.doe+newsletter@gmail.com')).toBe('johndoe@gmail.com');
    });

    it('handles googlemail.com the same as gmail.com', () => {
      expect(normalizeGmailDots('john.doe@googlemail.com')).toBe('johndoe@googlemail.com');
    });

    it('preserves dots for non-Gmail domains', () => {
      expect(normalizeGmailDots('john.doe@company.com')).toBe('john.doe@company.com');
      expect(normalizeGmailDots('first.last@outlook.com')).toBe('first.last@outlook.com');
    });

    it('lowercases the entire email', () => {
      expect(normalizeGmailDots('JOHN.DOE@GMAIL.COM')).toBe('johndoe@gmail.com');
      expect(normalizeGmailDots('John.Doe@Company.Com')).toBe('john.doe@company.com');
    });

    it('handles edge cases', () => {
      expect(normalizeGmailDots('')).toBe('');
      expect(normalizeGmailDots('nodomain')).toBe('nodomain');
    });
  });

  describe('getCanonicalEmail', () => {
    it('returns normalized Gmail addresses', () => {
      expect(getCanonicalEmail('j.o.h.n@gmail.com')).toBe('john@gmail.com');
      expect(getCanonicalEmail('  JOHN@GMAIL.COM  ')).toBe('john@gmail.com');
    });

    it('trims and lowercases all emails', () => {
      expect(getCanonicalEmail('  USER@EXAMPLE.COM  ')).toBe('user@example.com');
    });
  });

  describe('validateEmailAdvanced', () => {
    it('accepts valid emails', () => {
      const result = validateEmailAdvanced('user@example.com');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('rejects invalid email format', () => {
      const result = validateEmailAdvanced('invalid-email');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('format');
    });

    it('rejects disposable emails', () => {
      const result = validateEmailAdvanced('user@mailinator.com');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('disposable');
    });

    it('rejects emails without @ symbol', () => {
      const result = validateEmailAdvanced('userexample.com');
      expect(result.valid).toBe(false);
    });

    it('rejects emails without domain extension', () => {
      const result = validateEmailAdvanced('user@example');
      expect(result.valid).toBe(false);
    });
  });
});
