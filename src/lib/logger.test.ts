import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from './logger';

describe('Logger', () => {
  let consoleSpy: { log: ReturnType<typeof vi.spyOn>; warn: ReturnType<typeof vi.spyOn>; error: ReturnType<typeof vi.spyOn> };
  let originalEnv: string;

  beforeEach(() => {
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };
    originalEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    (process.env as any).NODE_ENV = originalEnv;
  });

  describe('debug', () => {
    it('should log in development mode', () => {
      (process.env as any).NODE_ENV = 'development';
      logger.debug('test debug message');
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should not log in production mode', () => {
      (process.env as any).NODE_ENV = 'production';
      logger.debug('test debug message');
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });
  });

  describe('info', () => {
    it('should log in development mode', () => {
      (process.env as any).NODE_ENV = 'development';
      logger.info('test info message');
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should not log in production mode', () => {
      (process.env as any).NODE_ENV = 'production';
      logger.info('test info message');
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });
  });

  describe('warn', () => {
    it('should always log warnings', () => {
      logger.warn('test warning');
      expect(consoleSpy.warn).toHaveBeenCalled();
    });

    it('should include context in warning', () => {
      logger.warn('test warning', { userId: '123' });
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('test warning'),
        expect.objectContaining({ userId: '123' })
      );
    });
  });

  describe('error', () => {
    it('should always log errors', () => {
      const testError = new Error('test error');
      logger.error('test error message', testError);
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should include error stack in context', () => {
      const testError = new Error('test error');
      logger.error('test error message', testError);
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('test error message'),
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'test error',
            stack: expect.any(String),
          }),
        })
      );
    });
  });

  describe('critical', () => {
    it('should log critical errors with high severity', () => {
      const testError = new Error('critical error');
      logger.critical('critical message', testError);
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('[CRITICAL]'),
        expect.any(Object)
      );
    });
  });

  describe('child logger', () => {
    it('should create child logger with inherited context', () => {
      const childLogger = logger.child({ component: 'TestComponent' });
      
      childLogger.info('test message');
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('test message'),
        expect.objectContaining({
          component: 'TestComponent',
        })
      );
    });
  });

  describe('context handling', () => {
    it('should include route information when available', () => {
      logger.info('test', { route: '/dashboard' });
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ route: '/dashboard' })
      );
    });

    it('should handle metadata objects', () => {
      const metadata = { foo: 'bar', nested: { key: 'value' } };
      logger.info('test', metadata);
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining(metadata)
      );
    });
  });
});
