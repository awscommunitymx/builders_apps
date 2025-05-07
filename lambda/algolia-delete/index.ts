import { Handler } from 'aws-lambda';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import algoliasearch from 'algoliasearch';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';

// Initialize utilities
const SERVICE_NAME = 'algolia-delete-service';
const tracer = new Tracer({ serviceName: SERVICE_NAME });
const logger = new Logger({ serviceName: SERVICE_NAME });
const metrics = new Metrics({ namespace: 'Profiles', serviceName: SERVICE_NAME });

interface AlgoliaDeleteEvent {
  user_id: string;
  action: 'delete';
}

const getSecretValue = async (secretName: string): Promise<string> => {
  const secretsManager = new SecretsManagerClient({});
  const command = new GetSecretValueCommand({ SecretId: secretName });
  const response = await secretsManager.send(command);

  if (response.SecretString) {
    return response.SecretString;
  } else {
    throw new Error(`Secret ${secretName} not found`);
  }
};

export const handler: Handler<AlgoliaDeleteEvent> = async (event) => {
  try {
    logger.info('Processing Algolia delete event', { event });
    metrics.addMetric('AlgoliaDeleteAttempt', MetricUnit.Count, 1);

    const { user_id, action } = event;

    if (!user_id || action !== 'delete') {
      throw new Error('Invalid event: missing user_id or action is not delete');
    }

    const apiKeySecretName = process.env.ALGOLIA_API_KEY_SECRET;
    const appIdSecretName = process.env.ALGOLIA_APP_ID_SECRET;

    if (!apiKeySecretName || !appIdSecretName) {
      throw new Error('Missing Algolia secret environment variables');
    }

    const [apiKey, appId] = await Promise.all([
      getSecretValue(apiKeySecretName),
      getSecretValue(appIdSecretName),
    ]);

    const client = algoliasearch(appId, apiKey);
    const index = client.initIndex(process.env.ALGOLIA_INDEX_NAME || 'users');

    logger.info('Deleting user from Algolia', { objectID: user_id });
    const result = await index.deleteObject(user_id);

    logger.info('Algolia delete completed successfully', { result });
    metrics.addMetric('AlgoliaDeleteSuccess', MetricUnit.Count, 1);

    return {
      statusCode: 200,
      body: {
        message: 'User deleted from Algolia successfully',
        objectID: user_id,
        taskID: result.taskID,
      },
    };
  } catch (error: any) {
    logger.error('Error deleting user from Algolia index', { error: error.message });
    metrics.addMetric('AlgoliaDeleteError', MetricUnit.Count, 1);
    throw error;
  } finally {
    metrics.publishStoredMetrics();
  }
};
