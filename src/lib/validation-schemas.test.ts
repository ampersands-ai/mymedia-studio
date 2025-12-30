import { describe, it, expect } from 'vitest';
import { 
  emailSchema, 
  passwordSchema, 
  profileNameSchema,
  signupSchema,
  loginSchema,
  generationRequestSchema,
  tokenOperationSchema,
  rateLimitSchema
} from './validation-schemas';

describe('Validation Schemas', () => {
  describe('emailSchema', () => {
    it('accepts valid email formats', () => {
      expect(emailSchema.safeParse('user@example.com').success).toBe(true);
      expect(emailSchema.safeParse('user.name@domain.co.uk').success).toBe(true);
      expect(emailSchema.safeParse('user+tag@example.org').success).toBe(true);
    });

    it('rejects invalid email formats', () => {
      expect(emailSchema.safeParse('invalid').success).toBe(false);
      expect(emailSchema.safeParse('missing@').success).toBe(false);
      expect(emailSchema.safeParse('@nodomain.com').success).toBe(false);
      expect(emailSchema.safeParse('spaces in@email.com').success).toBe(false);
    });

    it('rejects emails exceeding max length', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      expect(emailSchema.safeParse(longEmail).success).toBe(false);
    });

    it('trims whitespace from emails', () => {
      const result = emailSchema.safeParse('  user@example.com  ');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('user@example.com');
      }
    });
  });

  describe('passwordSchema', () => {
    it('accepts strong passwords', () => {
      expect(passwordSchema.safeParse('Password123!').success).toBe(true);
      expect(passwordSchema.safeParse('Str0ng@Pass').success).toBe(true);
      expect(passwordSchema.safeParse('MyP@ssw0rd').success).toBe(true);
    });

    it('rejects passwords without uppercase', () => {
      const result = passwordSchema.safeParse('password123!');
      expect(result.success).toBe(false);
    });

    it('rejects passwords without lowercase', () => {
      const result = passwordSchema.safeParse('PASSWORD123!');
      expect(result.success).toBe(false);
    });

    it('rejects passwords without numbers', () => {
      const result = passwordSchema.safeParse('Password!!');
      expect(result.success).toBe(false);
    });

    it('rejects passwords without special characters', () => {
      const result = passwordSchema.safeParse('Password123');
      expect(result.success).toBe(false);
    });

    it('rejects passwords shorter than 8 characters', () => {
      const result = passwordSchema.safeParse('Pa1!');
      expect(result.success).toBe(false);
    });

    it('rejects passwords exceeding max length', () => {
      const longPassword = 'Pa1!' + 'a'.repeat(100);
      expect(passwordSchema.safeParse(longPassword).success).toBe(false);
    });
  });

  describe('profileNameSchema', () => {
    it('accepts valid profile names', () => {
      expect(profileNameSchema.safeParse('john_doe').success).toBe(true);
      expect(profileNameSchema.safeParse('User123').success).toBe(true);
      expect(profileNameSchema.safeParse('test_user_1').success).toBe(true);
    });

    it('rejects names with special characters', () => {
      expect(profileNameSchema.safeParse('john-doe').success).toBe(false);
      expect(profileNameSchema.safeParse('user@name').success).toBe(false);
      expect(profileNameSchema.safeParse('user name').success).toBe(false);
    });

    it('rejects names shorter than 3 characters', () => {
      expect(profileNameSchema.safeParse('ab').success).toBe(false);
    });

    it('rejects names longer than 20 characters', () => {
      expect(profileNameSchema.safeParse('a'.repeat(21)).success).toBe(false);
    });
  });

  describe('signupSchema', () => {
    it('validates matching passwords', () => {
      const result = signupSchema.safeParse({
        email: 'user@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      });
      expect(result.success).toBe(true);
    });

    it('rejects mismatched passwords', () => {
      const result = signupSchema.safeParse({
        email: 'user@example.com',
        password: 'Password123!',
        confirmPassword: 'Different123!'
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toContain('confirmPassword');
      }
    });

    it('validates email format', () => {
      const result = signupSchema.safeParse({
        email: 'invalid-email',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('accepts valid login credentials', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: 'anypassword'
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty password', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: ''
      });
      expect(result.success).toBe(false);
    });
  });

  describe('generationRequestSchema', () => {
    it('accepts request with template_id', () => {
      const result = generationRequestSchema.safeParse({
        template_id: 'template-123',
        prompt: 'Generate something'
      });
      expect(result.success).toBe(true);
    });

    it('accepts request with model_id', () => {
      const result = generationRequestSchema.safeParse({
        model_id: 'model-123',
        prompt: 'Generate something'
      });
      expect(result.success).toBe(true);
    });

    it('accepts request with model_record_id', () => {
      const result = generationRequestSchema.safeParse({
        model_record_id: '123e4567-e89b-12d3-a456-426614174000',
        prompt: 'Generate something'
      });
      expect(result.success).toBe(true);
    });

    it('rejects request with both template_id and model_id', () => {
      const result = generationRequestSchema.safeParse({
        template_id: 'template-123',
        model_id: 'model-123',
        prompt: 'Generate something'
      });
      expect(result.success).toBe(false);
    });

    it('rejects request without template or model', () => {
      const result = generationRequestSchema.safeParse({
        prompt: 'Generate something'
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty prompt', () => {
      const result = generationRequestSchema.safeParse({
        model_id: 'model-123',
        prompt: ''
      });
      expect(result.success).toBe(false);
    });

    it('rejects prompt exceeding max length', () => {
      const result = generationRequestSchema.safeParse({
        model_id: 'model-123',
        prompt: 'a'.repeat(5001)
      });
      expect(result.success).toBe(false);
    });
  });

  describe('tokenOperationSchema', () => {
    it('accepts valid token operation', () => {
      const result = tokenOperationSchema.safeParse({
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        amount: 100
      });
      expect(result.success).toBe(true);
    });

    it('accepts negative amounts for deductions', () => {
      const result = tokenOperationSchema.safeParse({
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        amount: -50
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid UUID', () => {
      const result = tokenOperationSchema.safeParse({
        user_id: 'invalid-uuid',
        amount: 100
      });
      expect(result.success).toBe(false);
    });

    it('rejects amount exceeding limits', () => {
      const result = tokenOperationSchema.safeParse({
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        amount: 200000
      });
      expect(result.success).toBe(false);
    });
  });

  describe('rateLimitSchema', () => {
    it('accepts valid rate limit check', () => {
      const result = rateLimitSchema.safeParse({
        identifier: 'user@example.com',
        action: 'login'
      });
      expect(result.success).toBe(true);
    });

    it('accepts all valid actions', () => {
      const actions = ['login', 'signup', 'generation', 'api_call'];
      actions.forEach(action => {
        const result = rateLimitSchema.safeParse({
          identifier: 'test-id',
          action
        });
        expect(result.success).toBe(true);
      });
    });

    it('rejects invalid action', () => {
      const result = rateLimitSchema.safeParse({
        identifier: 'test-id',
        action: 'invalid_action'
      });
      expect(result.success).toBe(false);
    });
  });
});
