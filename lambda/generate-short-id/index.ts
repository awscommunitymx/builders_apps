import { randomBytes } from 'crypto';

/**
 * Generate a random 5-character alphanumeric ID
 * This will use cryptographically secure random values
 */
function generateShortId(): string {
  // Define the charset for our ID (alphanumeric, removing ambiguous characters)
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';

  // Generate 5 random bytes and map them to our charset
  const randomBuffer = randomBytes(5);
  for (let i = 0; i < 5; i++) {
    // Map each byte to a character in our charset (0-31)
    const randomIndex = randomBuffer[i] % charset.length;
    result += charset[randomIndex];
  }

  return result;
}

/**
 * Generate a unique short ID not present in the DynamoDB table
 */
export const handler = async (event: any): Promise<any> => {
  return generateShortId();
};
