import { describe, it, expect } from 'vitest';
import {
  hasWorkflowSteps,
  hasModelMetadata,
  hasModelConfig,
  isCompleteTemplate,
  isRecord,
  isNonEmptyArray,
  hasGenerationMetadata,
  hasValidCostMultipliers,
  isValidNumber,
  isNonEmptyString,
} from '../type-guards';

describe('type-guards', () => {
  describe('hasWorkflowSteps', () => {
    it('returns true for objects with workflow_steps array', () => {
      const template = { workflow_steps: [{ id: '1' }] };
      expect(hasWorkflowSteps(template)).toBe(true);
    });

    it('returns false for empty workflow_steps', () => {
      const template = { workflow_steps: [] };
      expect(hasWorkflowSteps(template)).toBe(false);
    });

    it('returns false for missing workflow_steps', () => {
      const template = { name: 'test' };
      expect(hasWorkflowSteps(template)).toBe(false);
    });

    it('returns false for non-object values', () => {
      expect(hasWorkflowSteps(null)).toBe(false);
      expect(hasWorkflowSteps(undefined)).toBe(false);
      expect(hasWorkflowSteps('string')).toBe(false);
      expect(hasWorkflowSteps(123)).toBe(false);
    });
  });

  describe('hasModelMetadata', () => {
    it('returns true for objects with modelMetadata', () => {
      const generation = { modelMetadata: { id: '1' } };
      expect(hasModelMetadata(generation)).toBe(true);
    });

    it('returns false for null modelMetadata', () => {
      const generation = { modelMetadata: null };
      expect(hasModelMetadata(generation)).toBe(false);
    });

    it('returns false for undefined modelMetadata', () => {
      const generation = {};
      expect(hasModelMetadata(generation)).toBe(false);
    });
  });

  describe('hasModelConfig', () => {
    it('returns true for valid model config', () => {
      const step = { model_id: 'model-1', model_record_id: 'record-1' };
      expect(hasModelConfig(step)).toBe(true);
    });

    it('returns false for empty strings', () => {
      expect(hasModelConfig({ model_id: '', model_record_id: 'record-1' })).toBe(false);
      expect(hasModelConfig({ model_id: 'model-1', model_record_id: '' })).toBe(false);
    });

    it('returns false for missing properties', () => {
      expect(hasModelConfig({ model_id: 'model-1' })).toBe(false);
      expect(hasModelConfig({ model_record_id: 'record-1' })).toBe(false);
    });
  });

  describe('isCompleteTemplate', () => {
    it('returns true for complete templates', () => {
      const template = {
        id: 'template-1',
        name: 'My Template',
        workflow_steps: [{ id: 'step-1' }],
      };
      expect(isCompleteTemplate(template)).toBe(true);
    });

    it('returns false for missing id', () => {
      const template = {
        name: 'My Template',
        workflow_steps: [{ id: 'step-1' }],
      };
      expect(isCompleteTemplate(template)).toBe(false);
    });

    it('returns false for empty workflow_steps', () => {
      const template = {
        id: 'template-1',
        name: 'My Template',
        workflow_steps: [],
      };
      expect(isCompleteTemplate(template)).toBe(false);
    });
  });

  describe('isRecord', () => {
    it('returns true for plain objects', () => {
      expect(isRecord({})).toBe(true);
      expect(isRecord({ key: 'value' })).toBe(true);
    });

    it('returns false for arrays', () => {
      expect(isRecord([])).toBe(false);
      expect(isRecord([1, 2, 3])).toBe(false);
    });

    it('returns false for null', () => {
      expect(isRecord(null)).toBe(false);
    });

    it('returns false for primitives', () => {
      expect(isRecord('string')).toBe(false);
      expect(isRecord(123)).toBe(false);
      expect(isRecord(true)).toBe(false);
      expect(isRecord(undefined)).toBe(false);
    });
  });

  describe('isNonEmptyArray', () => {
    it('returns true for non-empty arrays', () => {
      expect(isNonEmptyArray([1])).toBe(true);
      expect(isNonEmptyArray([1, 2, 3])).toBe(true);
      expect(isNonEmptyArray(['a', 'b'])).toBe(true);
    });

    it('returns false for empty arrays', () => {
      expect(isNonEmptyArray([])).toBe(false);
    });

    it('returns false for null and undefined', () => {
      expect(isNonEmptyArray(null)).toBe(false);
      expect(isNonEmptyArray(undefined)).toBe(false);
    });
  });

  describe('hasGenerationMetadata', () => {
    it('returns true for complete generation metadata', () => {
      const generation = {
        id: 'gen-1',
        modelMetadata: {
          id: 'model-1',
          model_name: 'Test Model',
          provider: 'test-provider',
          content_type: 'image',
        },
      };
      expect(hasGenerationMetadata(generation)).toBe(true);
    });

    it('returns false for incomplete metadata', () => {
      const generation = {
        id: 'gen-1',
        modelMetadata: {
          id: 'model-1',
          model_name: 'Test Model',
          // missing provider and content_type
        },
      };
      expect(hasGenerationMetadata(generation)).toBe(false);
    });
  });

  describe('hasValidCostMultipliers', () => {
    it('returns true for valid cost multipliers', () => {
      const config = {
        costMultipliers: {
          base: 1.0,
          premium: 1.5,
        },
      };
      expect(hasValidCostMultipliers(config)).toBe(true);
    });

    it('returns false for non-number multipliers', () => {
      const config = {
        costMultipliers: {
          base: 'invalid',
        },
      };
      expect(hasValidCostMultipliers(config)).toBe(false);
    });

    it('returns false for missing costMultipliers', () => {
      expect(hasValidCostMultipliers({})).toBe(false);
    });
  });

  describe('isValidNumber', () => {
    it('returns true for valid numbers', () => {
      expect(isValidNumber(0)).toBe(true);
      expect(isValidNumber(42)).toBe(true);
      expect(isValidNumber(-10)).toBe(true);
      expect(isValidNumber(3.14)).toBe(true);
    });

    it('returns false for NaN', () => {
      expect(isValidNumber(NaN)).toBe(false);
    });

    it('returns false for Infinity', () => {
      expect(isValidNumber(Infinity)).toBe(false);
      expect(isValidNumber(-Infinity)).toBe(false);
    });

    it('returns false for non-numbers', () => {
      expect(isValidNumber('42')).toBe(false);
      expect(isValidNumber(null)).toBe(false);
      expect(isValidNumber(undefined)).toBe(false);
    });
  });

  describe('isNonEmptyString', () => {
    it('returns true for non-empty strings', () => {
      expect(isNonEmptyString('hello')).toBe(true);
      expect(isNonEmptyString(' ')).toBe(true);
      expect(isNonEmptyString('a')).toBe(true);
    });

    it('returns false for empty strings', () => {
      expect(isNonEmptyString('')).toBe(false);
    });

    it('returns false for non-strings', () => {
      expect(isNonEmptyString(null)).toBe(false);
      expect(isNonEmptyString(undefined)).toBe(false);
      expect(isNonEmptyString(123)).toBe(false);
      expect(isNonEmptyString(['a'])).toBe(false);
    });
  });
});
