import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';
import { ProfileAccess, User } from '@awscommunity/generated-ts';
import { getAuthenticatedUser } from '../utils/getAuthenticatedUser';

const SERVICE_NAME = 'view-profile-service';

const tracer = new Tracer({ serviceName: SERVICE_NAME });
const logger = new Logger({ serviceName: SERVICE_NAME });
const metrics = new Metrics({ namespace: 'Profiles', serviceName: SERVICE_NAME });

const client = tracer.captureAWSv3Client(new DynamoDBClient({}));
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.TABLE_NAME!;

export default async function handleViewProfile(
  id: string,
  authenticatedUserSub: string,
  pin: string
): Promise<User | null> {
  // We no longer reference `event` here. Use passed-in params.
  logger.info('Handling viewProfile', { id });
  metrics.addMetric('ViewProfileAttempt', MetricUnit.Count, 1);

  if (pin.length !== 4) {
    logger.info('Invalid pin length', { id });
    metrics.addMetric('InvalidPinLength', MetricUnit.Count, 1);
    throw new Error('El PIN debe tener 4 dígitos');
  }
  if (!/^\d+$/.test(pin)) {
    logger.info('Invalid pin format', { id });
    metrics.addMetric('InvalidPinFormat', MetricUnit.Count, 1);
    throw new Error('El PIN debe contener solo dígitos');
  }

  // Query user by shortId
  const queryParams = {
    TableName: tableName,
    IndexName: 'short_id-index',
    KeyConditionExpression: 'short_id = :short_id',
    ExpressionAttributeValues: {
      ':short_id': id,
    },
    Limit: 1,
  };

  const segment = tracer.getSegment();
  const subSegment = segment?.addNewSubsegment('QueryUserByShortId');
  try {
    const queryResult = await docClient.send(new QueryCommand(queryParams));
    if (!queryResult.Items || queryResult.Items.length === 0) {
      logger.info('User not found', { id });
      metrics.addMetric('UserNotFound', MetricUnit.Count, 1);
      throw new Error('Usuario no encontrado');
    }
    const user = queryResult.Items[0] as User;
    if (!user.initialized) {
      logger.info('User not initialized', { id });
      metrics.addMetric('UserNotInitialized', MetricUnit.Count, 1);
      throw new Error('Este usuario no ha completado su perfil.');
    }

    if (user.pin?.toString() !== pin) {
      logger.info('Invalid PIN', { id });
      metrics.addMetric('InvalidPin', MetricUnit.Count, 1);
      throw new Error('PIN incorrecto');
    }

    // Check if user consented to data sharing
    if (!user.consent_data_sharing) {
      logger.info('User has not consented to data sharing', { id });
      metrics.addMetric('DataSharingNotConsented', MetricUnit.Count, 1);
      throw new Error('Este usuario no ha dado su consentimiento para compartir sus datos');
    }

    // Remove sensitive data
    delete user.initialized;
    delete user.pin;

    if (!user.share_email) {
      delete user.email;
    }

    if (!user.share_phone) {
      delete user.cell_phone;
    }

    // Query the authenticaded user by cognito_sub in the cognito_sub-index gsi
    const authenticatedUser = await getAuthenticatedUser(
      authenticatedUserSub,
      tracer,
      docClient,
      logger,
      metrics,
      tableName
    );

    // record view
    const viewItem: ProfileAccess = {
      PK: `VIEWED#${id}`,
      SK: `VIEWER#${authenticatedUser.user_id}`,
      timestamp: new Date().toISOString(),
    };
    await docClient.send(new PutCommand({ TableName: tableName, Item: viewItem }));
    metrics.addMetric('ProfileViewRecorded', MetricUnit.Count, 1);
    return user;
  } finally {
    subSegment?.close();
  }
}
