import { describe, it, expect } from 'vitest';
import { generateAuthDomain } from '../utils/cognito';

describe('cognito utilities', () => {
  describe('generateAuthDomain', () => {
    it('should return unmodified domain when length is within limits', () => {
      const result = generateAuthDomain('dev', 'app.awscommunity.mx');
      expect(result).toEqual({
        authDomain: 'auth-dev.app.awscommunity.mx',
        truncated: false,
      });
    });

    it('should truncate environment name when resulting domain would be too long', () => {
      const longEnv = 'feature-very-long-environment-name-that-exceeds-63-characters';
      const result = generateAuthDomain(longEnv, 'app.awscommunity.mx');
      expect(result.truncated).toBe(true);
      expect(result.authDomain.length).toBeLessThanOrEqual(63);
      expect(result.authDomain).toMatch(/^auth-.*\.app\.awscommunity\.mx$/);
    });

    it('should handle edge case when domain name would be exactly 63 characters', () => {
      const envName = 'a'.repeat(63 - 'auth-.app.awscommunity.mx'.length);
      const result = generateAuthDomain(envName, 'app.awscommunity.mx');
      expect(result.truncated).toBe(false);
      expect(result.authDomain.length).toBe(63);
    });
  });
});
