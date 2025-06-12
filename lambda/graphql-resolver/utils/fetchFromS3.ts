import { Logger } from "@aws-lambda-powertools/logger";
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

export const fetchFromS3 = async (key: string, s3Client: S3Client, S3_BUCKET: string, serviceName: string): Promise<any> => {
  const logger = new Logger({ serviceName: serviceName });

  try {
    logger.debug('Fetching data from S3', { bucket: S3_BUCKET, key });
    
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    });
    
    const response = await s3Client.send(command);
    
    if (!response.Body) {
      throw new Error(`No data found for key: ${key}`);
    }
    
    // Convert stream to string
    const bodyContents = await response.Body.transformToString();
    const data = JSON.parse(bodyContents);
    
    logger.debug('Successfully fetched data from S3', { 
      key, 
      dataSize: bodyContents.length,
      hasData: !!data 
    });
    
    return data;
  } catch (error) {
    logger.error('Error fetching data from S3', { 
      bucket: S3_BUCKET, 
      key, 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    if (error instanceof Error && error.name === 'NoSuchKey') {
      return null; // Return null for missing keys instead of throwing
    }
    
    throw error;
  }
};

