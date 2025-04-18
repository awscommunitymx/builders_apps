import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import middy from '@middy/core';
import { Context } from 'aws-lambda';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { fetchAttendeeData, extractAndValidateData } from './utils/attendee';
import { generateEventCode } from './utils/generateEventCode';
import { sendToSqs } from './services/sqs';
import { SQSClient } from '@aws-sdk/client-sqs';
import { storeAttendeeCheckIn } from '../../../utils/checkInService'
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';

const logger = new Logger({ serviceName: 'eventbrite-webhook' });
const tracer = new Tracer({ serviceName: 'eventbrite-webhook' });
const metrics = new Metrics({ serviceName: 'view-profile-service' });

const secretsManager = new SecretsManagerClient({});

const SECRET_NAME = process.env.SECRET_NAME!;
const DYNAMODB_TABLE_NAME = process.env.DYNAMODB_TABLE_NAME!;
const QUEUE_URL = process.env.QUEUE_URL!;

// Initialize DynamoDB and SQS with X-Ray tracing
const dynamoClient = tracer.captureAWSv3Client(new DynamoDBClient({}));
const docDynamoClient = DynamoDBDocumentClient.from(dynamoClient);
const sqsClient = tracer.captureAWSv3Client(new SQSClient({}));

let PRIVATE_TOKEN: string | undefined;

const getPrivateToken = async (): Promise<string> => {
  if (PRIVATE_TOKEN) return PRIVATE_TOKEN;
  try {
    const command = new GetSecretValueCommand({ SecretId: SECRET_NAME });
    const response = await secretsManager.send(command);
    PRIVATE_TOKEN = response.SecretString;
    if (!PRIVATE_TOKEN) {
      throw new Error('Private token not found in Secrets Manager');
    }
    return PRIVATE_TOKEN;
  } catch (err) {
    throw err;
  }
};

const baseHandler = async (event: any, context: Context) => {
  logger.addContext(context);

  try {
    const body = JSON.parse(event.body);
    const apiUrl = body.api_url;

    const token = await getPrivateToken();
    const attendeeData = await fetchAttendeeData(apiUrl, token);
    const extractedData = extractAndValidateData(attendeeData);
    const eventCode = generateEventCode(extractedData);
    extractedData.short_id = eventCode;

    logger.info('Data with event code', { data: extractedData });

    await storeAttendeeCheckIn(docDynamoClient, extractedData, DYNAMODB_TABLE_NAME);
    const sqsResult = await sendToSqs(sqsClient, QUEUE_URL, extractedData);

    return {
      statusCode: 200,
      body: JSON.stringify({
        attendee_data: extractedData,
        sqs_message_sent: sqsResult,
      }),
    };
  } catch (err: any) {
    logger.error('Error processing request', { error: err.message });
    metrics.addMetric('EventbriteWebhook', MetricUnit.Count, 1);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};

export const handler = middy(baseHandler)
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger));
