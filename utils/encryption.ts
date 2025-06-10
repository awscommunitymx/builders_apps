import { KMSClient, EncryptCommand, DecryptCommand } from '@aws-sdk/client-kms';

const kmsClient = new KMSClient({});

const { KMS_KEY_ID } = process.env;

export const encrypt = async (input: string): Promise<string> => {
  if (!KMS_KEY_ID) {
    throw new Error('KMS_KEY_ID environment variable is not set');
  }

  const command = new EncryptCommand({
    KeyId: KMS_KEY_ID,
    Plaintext: Buffer.from(input, 'utf8'),
  });

  const response = await kmsClient.send(command);

  if (!response.CiphertextBlob) {
    throw new Error('Failed to encrypt data - no ciphertext returned');
  }

  return Buffer.from(response.CiphertextBlob).toString('base64');
};

export const decrypt = async (ciphertext: string): Promise<string> => {
  const command = new DecryptCommand({
    CiphertextBlob: Buffer.from(ciphertext, 'base64'),
  });

  const response = await kmsClient.send(command);

  if (!response.Plaintext) {
    throw new Error('Failed to decrypt data - no plaintext returned');
  }

  return Buffer.from(response.Plaintext).toString('utf8');
};
