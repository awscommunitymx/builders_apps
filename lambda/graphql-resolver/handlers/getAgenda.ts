import { AgendaData } from "@awscommunity/generated-ts";
import { S3Client } from '@aws-sdk/client-s3';
import { Metrics, MetricUnit } from "@aws-lambda-powertools/metrics";
import { Logger } from "@aws-lambda-powertools/logger";
import { fetchFromS3 } from "../utils/fetchFromS3";

export const handleGetAgenda = async (s3Client: S3Client, s3Bucket: string, serviceName: string): Promise<AgendaData> => {
  const logger = new Logger({ serviceName: serviceName });
  const metrics = new Metrics({ namespace: 'Profiles', serviceName: serviceName });

  logger.info('Processing getAgenda request');
  
  try {
    const agendaData = await fetchFromS3('all-sessions.json', s3Client, s3Bucket, serviceName);
    
    if (!agendaData) {
      logger.warn('No agenda data found in S3');
      return { sessions: [] };
    }
    
    logger.info('Successfully retrieved agenda data', { 
      sessionCount: agendaData.sessions?.length || 0 
    });
    
    metrics.addMetric('GetAgendaSuccess', MetricUnit.Count, 1);
    metrics.addMetric('SessionsReturned', MetricUnit.Count, agendaData.sessions?.length || 0);
    
    return {
      sessions: agendaData.sessions || []
    };
  } catch (error) {
    logger.error('Error in handleGetAgenda', { error });
    metrics.addMetric('GetAgendaError', MetricUnit.Count, 1);
    throw error;
  }
};

