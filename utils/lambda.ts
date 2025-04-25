/**
 * Ensures Lambda function names stay within the AWS 64 character limit.
 * This implementation preserves the base name and trims from the environment name if needed.
 *
 * @param baseName The logical, readable part of the function name (preserved completely)
 * @param environment The environment name (e.g., 'dev', 'staging', 'production')
 * @param maxLength Optional maximum length (defaults to 64, AWS Lambda's limit)
 * @returns A Lambda function name that will not exceed the maximum length
 */
export const truncateLambdaName = (
  baseName: string,
  environment: string,
  maxLength = 64
): string => {
  // Calculate separator length (typically a hyphen)
  const separatorLength = 1;

  // If the combined name would be under the limit, just return the combined name
  const combinedName = `${baseName}-${environment}`;
  if (combinedName.length <= maxLength) {
    return combinedName;
  }

  // Calculate how much we need to trim from the environment name
  const availableLength = maxLength - baseName.length - separatorLength;

  // Ensure we have at least 1 character from the environment
  if (availableLength < 1) {
    // If there's not enough space even for 1 character of the environment,
    // we'll need to truncate the baseName after all (edge case)
    const trimmedBaseNameLength = maxLength - 2; // -2 for "-e" (minimum env representation)
    const trimmedBaseName = baseName.substring(0, trimmedBaseNameLength);
    return `${trimmedBaseName}-e`;
  }

  // Trim the environment name to fit the available space
  const trimmedEnvironment = environment.substring(0, availableLength);

  return `${baseName}-${trimmedEnvironment}`;
};
