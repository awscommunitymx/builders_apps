import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  UpdateCommandInput,
  UpdateCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics } from '@aws-lambda-powertools/metrics';
import { RegisterSponsorVisitInput, SponsorUser } from '@awscommunity/generated-ts';
import { getAuthenticatedUser } from '../utils/getAuthenticatedUser';
import { AppSyncIdentityCognito } from 'aws-lambda';

const SERVICE_NAME = 'update-user-service';

const tracer = new Tracer({ serviceName: SERVICE_NAME });
const logger = new Logger({ serviceName: SERVICE_NAME });
const metrics = new Metrics({ namespace: 'Profiles', serviceName: SERVICE_NAME });

const client = tracer.captureAWSv3Client(new DynamoDBClient({}));
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.TABLE_NAME!;

export default async function handleRegisterSponsorVisit(
  authenticatedUser: AppSyncIdentityCognito,
  updates: RegisterSponsorVisitInput
): Promise<SponsorUser> {
  const authenticatedUserSub = authenticatedUser.sub;

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
    throw new Error('No tienes permisos para registrar visitas de patrocinadores');
  }

  const queryUserParams = {
    TableName: tableName,
    IndexName: 'short_id-index',
    KeyConditionExpression: 'short_id = :short_id',
    ExpressionAttributeValues: {
      ':short_id': updates.short_id,
    },
    Limit: 1,
  };

  const segment = tracer.getSegment();
  const subSegment = segment?.addNewSubsegment('QueryUserByShortId');
  const queryResultUser = await docClient.send(new QueryCommand(queryUserParams));
  subSegment?.close();
  if (!queryResultUser.Items || queryResultUser.Items.length === 0) {
    logger.info('User not found', { short_id: authenticatedUserProfile.short_id });
    metrics.addMetric('UserNotFound', 'Count', 1);
    throw new Error('Usuario no encontrado');
  }

  const queryParams = {
    TableName: tableName,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `USER#${authenticatedUserProfile.user_id}`,
      ':sk': 'SPONSOR#',
    },
  };

  const queryResult = await docClient.send(new QueryCommand(queryParams));
  if (!queryResult.Items || queryResult.Items.length === 0) {
    logger.info('No estas asociado a ningun patrocinador', {
      userId: authenticatedUserProfile.user_id,
    });
    throw new Error('Tu usuario no está asociado a ningún patrocinador');
  }

  const sponsorId = queryResult.Items[0].SK.split('#')[1];

  const userQueryParams = {
    TableName: tableName,
    IndexName: 'short_id-index',
    KeyConditionExpression: 'short_id = :short_id',
    ExpressionAttributeValues: {
      ':short_id': updates.short_id,
    },
    Limit: 1,
  };
  const userQueryResult = await docClient.send(new QueryCommand(userQueryParams));
  if (!userQueryResult.Items || userQueryResult.Items.length === 0) {
    logger.info('User not found by short_id', { short_id: updates.short_id });
    metrics.addMetric('UserNotFoundByShortId', 'Count', 1);
    throw new Error('Usuario no encontrado por short_id');
  }
  let updated = userQueryResult.Items[0] as SponsorUser;

  const updateParams: UpdateCommandInput = {
    TableName: tableName,
    Key: { PK: `SPONSOR#${sponsorId}`, SK: `USER#${updated.user_id}` },
    UpdateExpression: 'SET #lastVisit = :lastVisit, #message = :message',
    ExpressionAttributeNames: {
      '#lastVisit': 'lastVisit',
      '#message': 'message',
    },
    ExpressionAttributeValues: {
      ':lastVisit': new Date().toISOString(),
      ':message': updates.message || '',
    },
  };

  await docClient.send(new UpdateCommand(updateParams));

  // Update the user record to append the sponsor ID to their list
  const userUpdateParams: UpdateCommandInput = {
    TableName: tableName,
    Key: { PK: `USER#${updated.user_id}`, SK: `USER#${updated.user_id}` },
    UpdateExpression:
      'SET #sponsorIds = list_append(if_not_exists(#sponsorIds, :empty_list), :sponsorId)',
    ExpressionAttributeNames: {
      '#sponsorIds': 'sponsorIds',
    },
    ExpressionAttributeValues: {
      ':empty_list': [],
      ':sponsorId': [sponsorId],
    },
  };

  await docClient.send(new UpdateCommand(userUpdateParams));

  updated.message = updates.message || '';

  return updated;
}
