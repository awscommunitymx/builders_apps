import { describe, it, expect } from 'vitest';
import { generateAuthDomain, getAuthUrls, sanitizeDomainPrefix } from '../utils/cognito';

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

    it('should handle production environment', () => {
      const result = generateAuthDomain('production', 'app.awscommunity.mx');
      expect(result).toEqual({
        authDomain: 'auth.app.awscommunity.mx',
        truncated: false,
      });
    });
  });

  describe('sanitizeDomainPrefix', () => {
    it('should convert to lowercase and remove special characters', () => {
      expect(sanitizeDomainPrefix('Feature/TEST-123')).toBe('profiles-featuretest123');
    });

    it('should replace cognito with profiles if present', () => {
      expect(sanitizeDomainPrefix('cognito-test')).toBe('profiles-profilestest');
    });

    it('should handle simple environment names', () => {
      expect(sanitizeDomainPrefix('dev')).toBe('profiles-dev');
    });
  });

  describe('getAuthUrls', () => {
    it('should return only localhost URL when appDomain is undefined', () => {
      const urls = getAuthUrls('dev', undefined, 'callback');
      expect(urls).toEqual(['http://localhost:5173/auth/callback']);
    });

    it('should return only production URL for production environment', () => {
      const urls = getAuthUrls('production', 'app.example.com', 'callback');
      expect(urls).toEqual(['https://app.example.com/auth/callback']);
    });

    it('should return both domain and localhost URLs for non-production environments', () => {
      const urls = getAuthUrls('dev', 'dev.example.com', 'callback');
      expect(urls).toEqual([
        'https://dev.example.com/auth/callback',
        'http://localhost:5173/auth/callback',
      ]);
    });
  });
});
