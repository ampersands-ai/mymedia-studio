import { describe, it, expect } from 'vitest';
import {
  emailSchema,
  passwordSchema,
  phoneSchema,
  zipcodeSchema,
  nameSchema,
  signupSchema,
  loginSchema,
  generationRequestSchema,
  tokenOperationSchema,
  rateLimitSchema,
  roleManagementSchema,
} from '../validation-schemas';

describe('validation-schemas', () => {
  describe('emailSchema', () => {
    it('accepts valid emails', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.org',
        'user+tag@gmail.com',
        'a@b.co',
      ];
      
      validEmails.forEach(email => {
        expect(emailSchema.safeParse(email).success).toBe(true);
      });
    });

    it('rejects invalid emails', () => {
      const invalidEmails = [
        'invalid',
        '@nodomain.com',
        'no@domain',
        '',
        'spaces in@email.com',
      ];
      
      invalidEmails.forEach(email => {
        expect(emailSchema.safeParse(email).success).toBe(false);
      });
    });

    it('trims whitespace', () => {
      const result = emailSchema.safeParse('  test@example.com  ');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('test@example.com');
      }
    });

    it('rejects emails over 255 characters', () => {
      const longEmail = 'a'.repeat(250) + '@test.com';
      expect(emailSchema.safeParse(longEmail).success).toBe(false);
    });
  });

  describe('passwordSchema', () => {
    it('accepts strong passwords', () => {
      const validPasswords = [
        'Test123!@#',
        'MyP@ssw0rd',
        'Str0ng_P@ss!',
        'C0mpl3x#Pass',
      ];
      
      validPasswords.forEach(password => {
        expect(passwordSchema.safeParse(password).success).toBe(true);
      });
    });

    it('rejects passwords without uppercase', () => {
      const result = passwordSchema.safeParse('test123!@#');
      expect(result.success).toBe(false);
    });

    it('rejects passwords without lowercase', () => {
      const result = passwordSchema.safeParse('TEST123!@#');
      expect(result.success).toBe(false);
    });

    it('rejects passwords without numbers', () => {
      const result = passwordSchema.safeParse('TestPass!@#');
      expect(result.success).toBe(false);
    });

    it('rejects passwords without special characters', () => {
      const result = passwordSchema.safeParse('TestPass123');
      expect(result.success).toBe(false);
    });

    it('rejects short passwords', () => {
      const result = passwordSchema.safeParse('Te1!');
      expect(result.success).toBe(false);
    });

    it('rejects passwords over 100 characters', () => {
      const longPassword = 'A1!' + 'a'.repeat(100);
      expect(passwordSchema.safeParse(longPassword).success).toBe(false);
    });
  });

  describe('phoneSchema', () => {
    it('accepts valid international phone numbers', () => {
      const validPhones = [
        '+12025551234',
        '+442071234567',
        '+919876543210',
        '12025551234',
      ];
      
      validPhones.forEach(phone => {
        expect(phoneSchema.safeParse(phone).success).toBe(true);
      });
    });

    it('accepts empty string (optional)', () => {
      expect(phoneSchema.safeParse('').success).toBe(true);
    });

    it('rejects invalid phone formats', () => {
      const invalidPhones = [
        'not-a-phone',
        '123',
        '+0123456789',
        '++12345678901',
      ];
      
      invalidPhones.forEach(phone => {
        const result = phoneSchema.safeParse(phone);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('zipcodeSchema', () => {
    it('accepts valid zipcodes', () => {
      const validZipcodes = [
        '12345',
        '12345-6789',
        'SW1A 1AA',
        'M5V 2T6',
      ];
      
      validZipcodes.forEach(zipcode => {
        expect(zipcodeSchema.safeParse(zipcode).success).toBe(true);
      });
    });

    it('accepts empty string (optional)', () => {
      expect(zipcodeSchema.safeParse('').success).toBe(true);
    });

    it('rejects zipcodes with special characters', () => {
      expect(zipcodeSchema.safeParse('123!45').success).toBe(false);
    });

    it('rejects zipcodes that are too short', () => {
      expect(zipcodeSchema.safeParse('12').success).toBe(false);
    });
  });

  describe('nameSchema', () => {
    it('accepts valid names', () => {
      const validNames = [
        'John',
        'John Doe',
        "O'Connor",
        'Mary-Jane',
      ];
      
      validNames.forEach(name => {
        expect(nameSchema.safeParse(name).success).toBe(true);
      });
    });

    it('rejects names with numbers', () => {
      expect(nameSchema.safeParse('John123').success).toBe(false);
    });

    it('rejects empty names', () => {
      expect(nameSchema.safeParse('').success).toBe(false);
    });

    it('rejects names over 50 characters', () => {
      const longName = 'A'.repeat(51);
      expect(nameSchema.safeParse(longName).success).toBe(false);
    });
  });

  describe('signupSchema', () => {
    it('accepts valid signup data', () => {
      const result = signupSchema.safeParse({
        email: 'test@example.com',
        password: 'Test123!@#',
        confirmPassword: 'Test123!@#',
      });
      expect(result.success).toBe(true);
    });

    it('rejects mismatched passwords', () => {
      const result = signupSchema.safeParse({
        email: 'test@example.com',
        password: 'Test123!@#',
        confirmPassword: 'Different123!@#',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toContain('confirmPassword');
      }
    });
  });

  describe('loginSchema', () => {
    it('accepts valid login data', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: 'anypassword',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty password', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('generationRequestSchema', () => {
    it('accepts request with template_id', () => {
      const result = generationRequestSchema.safeParse({
        template_id: 'my-template',
        prompt: 'Generate something',
      });
      expect(result.success).toBe(true);
    });

    it('accepts request with model_id', () => {
      const result = generationRequestSchema.safeParse({
        model_id: 'my-model',
        prompt: 'Generate something',
      });
      expect(result.success).toBe(true);
    });

    it('rejects request with both template_id and model_id', () => {
      const result = generationRequestSchema.safeParse({
        template_id: 'my-template',
        model_id: 'my-model',
        prompt: 'Generate something',
      });
      expect(result.success).toBe(false);
    });

    it('rejects request without prompt', () => {
      const result = generationRequestSchema.safeParse({
        template_id: 'my-template',
      });
      expect(result.success).toBe(false);
    });

    it('rejects prompt over 5000 characters', () => {
      const result = generationRequestSchema.safeParse({
        template_id: 'my-template',
        prompt: 'a'.repeat(5001),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('tokenOperationSchema', () => {
    it('accepts valid token operation', () => {
      const result = tokenOperationSchema.safeParse({
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        amount: 100,
        reason: 'Bonus credits',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid UUID', () => {
      const result = tokenOperationSchema.safeParse({
        user_id: 'not-a-uuid',
        amount: 100,
      });
      expect(result.success).toBe(false);
    });

    it('rejects amount outside range', () => {
      const result = tokenOperationSchema.safeParse({
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        amount: 1000000,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('rateLimitSchema', () => {
    it('accepts valid rate limit check', () => {
      const result = rateLimitSchema.safeParse({
        identifier: 'test@example.com',
        action: 'login',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid action', () => {
      const result = rateLimitSchema.safeParse({
        identifier: 'test@example.com',
        action: 'invalid_action',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('roleManagementSchema', () => {
    it('accepts valid role management', () => {
      const result = roleManagementSchema.safeParse({
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        role: 'admin',
        action: 'grant',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid role', () => {
      const result = roleManagementSchema.safeParse({
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        role: 'superadmin',
        action: 'grant',
      });
      expect(result.success).toBe(false);
    });
  });
});
