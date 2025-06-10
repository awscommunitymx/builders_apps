import { RoomAgendaData } from "@awscommunity/generated-ts";
import { S3Client } from '@aws-sdk/client-s3';
import { Metrics, MetricUnit } from "@aws-lambda-powertools/metrics";
import { Logger } from "@aws-lambda-powertools/logger";
import { fetchFromS3 } from "../utils/fetchFromS3";

export const handleGetRoomAgenda = async (location: string, s3Client: S3Client, s3Bucket: string, serviceName: string): Promise<RoomAgendaData> => {

  const logger = new Logger({ serviceName: serviceName });
  const metrics = new Metrics({ namespace: 'Profiles', serviceName: serviceName });

  logger.info('Processing getRoomAgenda request', { location });
  
  try {
    const roomKey = `room-${location}.json`;
    const roomData = await fetchFromS3(roomKey, s3Client, s3Bucket, serviceName);
    
    if (!roomData) {
      logger.warn('No room data found in S3', { location, key: roomKey });
      return { 
        location, 
        sessions: [] 
      };
    }
    
    logger.info('Successfully retrieved room agenda data', { 
      location,
      sessionCount: roomData.sessions?.length || 0 
    });
    
    metrics.addMetric('GetRoomAgendaSuccess', MetricUnit.Count, 1);
    metrics.addMetric('RoomSessionsReturned', MetricUnit.Count, roomData.sessions?.length || 0);
    
    return {
      location: roomData.location || location,
      sessions: roomData.sessions || []
    };
  } catch (error) {
    logger.error('Error in handleGetRoomAgenda', { location, error });
    metrics.addMetric('GetRoomAgendaError', MetricUnit.Count, 1);
    throw error;
  }
};

