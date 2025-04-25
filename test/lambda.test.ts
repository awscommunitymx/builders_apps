import { describe, it, expect } from 'vitest';
import { truncateLambdaName } from '../utils/lambda';

describe('truncateLambdaName', () => {
  it('should return the original name when under the limit', () => {
    const result = truncateLambdaName('ShortFunction', 'dev');
    expect(result).toBe('ShortFunction-dev');
  });

  it('should preserve the base name and trim from the environment when the combined name exceeds the limit', () => {
    const baseName = 'MyFunction';
    const longEnvironment =
      'feature--123-this-is-a-very-long-branch-name-that-will-make-the-lambda-name-too-long';

    const result = truncateLambdaName(baseName, longEnvironment);

    // Check that the result obeys the maximum length
    expect(result.length).toBeLessThanOrEqual(64);
    // Check that the base name is preserved completely
    expect(result.startsWith(`${baseName}-`)).toBe(true);
    // Check that the environment name is truncated
    expect(result).not.toBe(`${baseName}-${longEnvironment}`);
  });

  it('should handle a custom maximum length', () => {
    const result = truncateLambdaName('MediumFunction', 'staging', 20);
    expect(result.length).toBeLessThanOrEqual(20);
    expect(result.startsWith('MediumFunction-')).toBe(true);
  });

  it('should handle the extreme case where base name is nearly at the limit', () => {
    // Using a very long base name that's close to the limit
    const longBaseName = 'ThisIsAReallyReallyReallyLongBaseNameThatIsVeryCloseToTheLimit';
    const environment = 'production';

    const result = truncateLambdaName(longBaseName, environment, 64);

    // Check that the result obeys the maximum length
    expect(result.length).toBeLessThanOrEqual(64);

    // In this extreme case, we should have the base name (possibly truncated) and a minimal env
    expect(result).toMatch(/^.+-[a-z]$/);
  });
});
