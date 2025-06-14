import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommandInput, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';
import { UpdateUserInput, User } from '@awscommunity/generated-ts';
import { getAuthenticatedUser } from '../utils/getAuthenticatedUser';

const SERVICE_NAME = 'update-user-service';

const tracer = new Tracer({ serviceName: SERVICE_NAME });
const logger = new Logger({ serviceName: SERVICE_NAME });
const metrics = new Metrics({ namespace: 'Profiles', serviceName: SERVICE_NAME });

const client = tracer.captureAWSv3Client(new DynamoDBClient({}));
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.TABLE_NAME!;

export default async function handleUpdateUser(
  authenticatedUserSub: string,
  updates: UpdateUserInput
): Promise<User> {
  const authenticatedUser = await getAuthenticatedUser(
    authenticatedUserSub,
    tracer,
    docClient,
    logger,
    metrics,
    tableName
  );

  logger.debug('Handling updateUser', { authenticatedUserSub, updates });

  if (!updates.pin) {
    throw new Error('El PIN es obligatorio');
  }

  // Build UpdateExpression dynamically based on provided values
  const setExpressions: string[] = [
    '#company = :company',
    '#pin = :pin',
    '#job_title = :job_title',
    '#share_email = :share_email',
    '#share_phone = :share_phone',
    '#consent_data_sharing = :consent_data_sharing',
    '#initialized = :initialized'
  ];

  const expressionAttributeNames: Record<string, string> = {
    '#company': 'company',
    '#pin': 'pin',
    '#job_title': 'job_title',
    '#share_email': 'share_email',
    '#share_phone': 'share_phone',
    '#consent_data_sharing': 'consent_data_sharing',
    '#initialized': 'initialized',
  };

  const expressionAttributeValues: Record<string, any> = {
    ':company': updates.company,
    ':pin': updates.pin,
    ':job_title': updates.role,
    ':share_email': updates.share_email,
    ':share_phone': updates.share_phone,
    ':consent_data_sharing': updates.consent_data_sharing,
    ':initialized': true,
  };

  // Only add social media fields if they are provided
  if (updates.twitter_url !== undefined) {
    setExpressions.push('#twitter_url = :twitter_url');
    expressionAttributeNames['#twitter_url'] = 'twitter_url';
    expressionAttributeValues[':twitter_url'] = updates.twitter_url;
  }

  if (updates.linkedin_url !== undefined) {
    setExpressions.push('#linkedin_url = :linkedin_url');
    expressionAttributeNames['#linkedin_url'] = 'linkedin_url';
    expressionAttributeValues[':linkedin_url'] = updates.linkedin_url;
  }

  if (updates.blog_url !== undefined) {
    setExpressions.push('#blog_url = :blog_url');
    expressionAttributeNames['#blog_url'] = 'blog_url';
    expressionAttributeValues[':blog_url'] = updates.blog_url;
  }

  const updateParams: UpdateCommandInput = {
    TableName: tableName,
    Key: { PK: `USER#${authenticatedUser.user_id}`, SK: 'PROFILE' },
    UpdateExpression: `SET ${setExpressions.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ConditionExpression: 'attribute_exists(PK)',
  };

  const result = await docClient.send(new UpdateCommand(updateParams));
  const updated = result.Attributes as User;
  metrics.addMetric('UpdateUserSuccess', MetricUnit.Count, 1);
  return updated;
}
