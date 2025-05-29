import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  UpdateCommandInput,
  UpdateCommand,
  QueryCommand,
  GetCommand,
} from '@aws-sdk/lib-dynamodb';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics } from '@aws-lambda-powertools/metrics';
import { SponsorDashboard, SponsorUser } from '@awscommunity/generated-ts';
import { getAuthenticatedUser } from '../utils/getAuthenticatedUser';
import { AppSyncIdentityCognito } from 'aws-lambda';

const SERVICE_NAME = 'update-user-service';

const tracer = new Tracer({ serviceName: SERVICE_NAME });
const logger = new Logger({ serviceName: SERVICE_NAME });
const metrics = new Metrics({ namespace: 'Profiles', serviceName: SERVICE_NAME });

const client = tracer.captureAWSv3Client(new DynamoDBClient({}));
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.TABLE_NAME!;

export default async function getSponsorDashboard(
  authenticatedUser: AppSyncIdentityCognito
): Promise<SponsorDashboard> {
  const authenticatedUserSub = authenticatedUser.sub;
  const segment = tracer.getSegment();

  const authenticatedUserProfile = await getAuthenticatedUser(
    authenticatedUserSub,
    tracer,
    docClient,
    logger,
    metrics,
    tableName
  );

  const groups = authenticatedUser.groups || [];
  if (!groups.includes('Sponsors')) {
    throw new Error('No tienes permisos para ver visitas de patrocinadores');
  }

  const queryParams = {
    TableName: tableName,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `USER#${authenticatedUserProfile.user_id}`,
      ':sk': 'SPONSOR#',
    },
  };

  const subSegment = segment?.addNewSubsegment('QuerySponsorVisits');
  subSegment?.addAnnotation('userId', authenticatedUserProfile.user_id);
  const queryResult = await docClient.send(new QueryCommand(queryParams));
  if (!queryResult.Items || queryResult.Items.length === 0) {
    logger.info('No se encontraron visitas de patrocinadores para el usuario', {
      userId: authenticatedUserProfile.user_id,
    });
    throw new Error('Tu usuario no está asociado a ningún patrocinador');
  }
  subSegment?.close();

  const sponsorId = queryResult.Items[0].SK.split('#')[1];

  const getSponsorMetadataParams = {
    TableName: tableName,
    Key: {
      PK: `SPONSOR#${sponsorId}`,
      SK: 'METADATA',
    },
  };

  const sponsorMetadataSegment = segment?.addNewSubsegment('GetSponsorMetadata');
  sponsorMetadataSegment?.addAnnotation('sponsorId', sponsorId);
  const sponsorMetadataResult = await docClient.send(new GetCommand(getSponsorMetadataParams));
  sponsorMetadataSegment?.close();
  if (!sponsorMetadataResult.Item) {
    logger.info('No se encontró metadata del patrocinador', { sponsorId });
    throw new Error('No se encontró metadata del patrocinador');
  }
  const sponsorMetadata = sponsorMetadataResult.Item;

  const sponsorScanQueryParams = {
    TableName: tableName,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `SPONSOR#${sponsorId}`,
      ':sk': 'USER#',
    },
  };

  const sponsorScanSegment = segment?.addNewSubsegment('QuerySponsorUsers');
  sponsorScanSegment?.addAnnotation('sponsorId', sponsorId);
  sponsorScanSegment?.addAnnotation('userId', authenticatedUserProfile.user_id);
  const sponsorQueryResult = await docClient.send(new QueryCommand(sponsorScanQueryParams));
  if (!sponsorQueryResult.Items || sponsorQueryResult.Items.length === 0) {
    logger.info('No se encontraron usuarios asociados al patrocinador', {
      sponsorId,
    });
    return {
      sponsor_name: sponsorMetadata.name,
      visits: [],
      total_visits: 0,
    };
  }
  sponsorScanSegment?.close();

  const sponsorUsers: Array<SponsorUser> = [];
  for (const item of sponsorQueryResult.Items) {
    const userId = item.SK.split('#')[1];

    const userQueryParams = {
      TableName: tableName,
      Key: {
        PK: `USER#${userId}`,
        SK: 'PROFILE',
      },
    };

    const userQuerySegment = segment?.addNewSubsegment(`QueryUserProfile-${userId}`);
    userQuerySegment?.addAnnotation('userId', userId);
    userQuerySegment?.addAnnotation('sponsorId', sponsorId);
    const userQueryResult = await docClient.send(new GetCommand(userQueryParams));
    if (!userQueryResult.Item) {
      logger.info('No se encontró el perfil del usuario', { userId });
      continue;
    }
    userQuerySegment?.close();

    let userProfile = userQueryResult.Item as SponsorUser;
    userProfile.message = item.message || '';
    userProfile.last_visit = item.lastVisit || new Date().toISOString();

    sponsorUsers.push(userProfile);
  }

  logger.info('Sponsor dashboard retrieved successfully', {
    sponsorUsersCount: sponsorUsers.length,
  });
  return {
    sponsor_name: sponsorMetadata.name,
    visits: sponsorUsers,
    total_visits: sponsorUsers.length,
  };
}
