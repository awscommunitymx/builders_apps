import { Handler } from 'aws-lambda';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import algoliasearch from 'algoliasearch';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';

// Initialize utilities
const SERVICE_NAME = 'algolia-update-service';
const tracer = new Tracer({ serviceName: SERVICE_NAME });
const logger = new Logger({ serviceName: SERVICE_NAME });
const metrics = new Metrics({ namespace: 'Profiles', serviceName: SERVICE_NAME });

// DynamoDB field names to Algolia attribute mapping
const FIELD_MAPPING: Record<string, string> = {
  user_id: 'objectID', // Use user_id as the unique identifier in Algolia
  name: 'name',
  email: 'email',
  company: 'company',
  job_title: 'jobTitle',
  role: 'role',
  cell_phone: 'phone',
  ticket_class_id: 'ticketClass',
  gender: 'gender',
  // Add any other fields that should be indexed in Algolia
};

interface AlgoliaUpdateEvent {
  user: Record<string, any>;
  action: 'create' | 'update';
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

/**
 * Lambda handler for updating Algolia index
 * When a user is created or updated, this function will update the Algolia index accordingly
 */
export const handler: Handler<AlgoliaUpdateEvent> = async (event) => {
  try {
    logger.info('Processing Algolia update event', { event });
    metrics.addMetric('AlgoliaUpdateAttempt', MetricUnit.Count, 1);

    // Get the secrets for Algolia from AWS Secrets Manager
    const secretsManager = new SecretsManagerClient();
    const apiKeySecretName = process.env.ALGOLIA_API_KEY_SECRET;
    const appIdSecretName = process.env.ALGOLIA_APP_ID_SECRET;

    if (!apiKeySecretName || !appIdSecretName) {
      throw new Error('Missing Algolia secret environment variables');
    }

    // Fetch secrets in parallel
    const [apiKey, appId] = await Promise.all([
      getSecretValue(apiKeySecretName),
      getSecretValue(appIdSecretName),
    ]);

    // Initialize the Algolia client
    const client = algoliasearch(appId, apiKey);
    const index = client.initIndex(process.env.ALGOLIA_INDEX_NAME || 'users');

    // Prepare data for Algolia
    const userData = event.user;
    if (!userData || !userData.user_id) {
      throw new Error('Invalid user data: missing user_id');
    }

    // Map the user data to Algolia format
    const algoliaObject: Record<string, any> = {};
    Object.entries(userData).forEach(([key, value]) => {
      const algoliaKey = FIELD_MAPPING[key] || key;
      if (value !== undefined && value !== null) {
        algoliaObject[algoliaKey] = value;

        // Process phone number to add multiple formats
        if (key === 'cell_phone' && typeof value === 'string' && value.trim() !== '') {
          const phoneNumber = value.trim();

          // Store the version without the + sign
          if (phoneNumber.startsWith('+')) {
            algoliaObject['phoneWithoutPlus'] = phoneNumber.substring(1);

            // Store the last 10 digits of the phone number
            if (phoneNumber.length > 10) {
              algoliaObject['phoneTenDigits'] = phoneNumber.substring(phoneNumber.length - 10);
            }
          }
        }
      }
    });

    // Ensure objectID is set (required by Algolia)
    algoliaObject.objectID = userData.user_id;

    // Save object to Algolia
    logger.info('Saving user to Algolia', { objectID: algoliaObject.objectID });
    const result = await index.saveObject(algoliaObject);

    logger.info('Algolia update completed successfully', { result });
    metrics.addMetric('AlgoliaUpdateSuccess', MetricUnit.Count, 1);

    return {
      statusCode: 200,
      body: {
        message: 'User data updated in Algolia successfully',
        objectID: algoliaObject.objectID,
        taskID: result.taskID,
      },
    };
  } catch (error: any) {
    logger.error('Error updating Algolia index', { error: error.message });
    metrics.addMetric('AlgoliaUpdateError', MetricUnit.Count, 1);

    throw error;
  } finally {
    metrics.publishStoredMetrics();
  }
};
