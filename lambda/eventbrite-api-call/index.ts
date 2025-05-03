import { Handler } from 'aws-lambda';
import axios from 'axios';
import { SecretsManager } from 'aws-sdk';

interface EventbriteApiEvent {
  config: {
    action: string;
    [key: string]: any;
  };
  api_url: string;
}

interface EventbriteApiResult {
  statusCode: number;
  body: any;
  [key: string]: any;
}

/**
 * Lambda function to call Eventbrite API
 * Makes a GET request to the specified path with appropriate authorization
 * Retrieves API key from AWS Secrets Manager directly
 */
export const handler: Handler<EventbriteApiEvent, EventbriteApiResult> = async (event) => {
  console.log('Calling Eventbrite API with path:', event.api_url);

  try {
    // Get the API key directly from Secrets Manager
    const secretsManager = new SecretsManager();
    const secretName = process.env.SECRET_NAME;

    if (!secretName) {
      throw new Error('Missing SECRET_NAME environment variable');
    }

    // Retrieve the secret value from AWS Secrets Manager
    const secretResponse = await secretsManager.getSecretValue({ SecretId: secretName }).promise();

    let apiKey;
    if (secretResponse.SecretString) {
      // Try to parse as JSON, if it fails, use the string directly
      try {
        const secret = JSON.parse(secretResponse.SecretString);
        apiKey = secret.apiKey || secret.API_KEY || secretResponse.SecretString;
      } catch (e) {
        apiKey = secretResponse.SecretString;
      }
    } else {
      throw new Error('No secret value found');
    }

    // Make the API call to Eventbrite
    const response = await axios({
      method: 'GET',
      url: event.api_url,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Eventbrite API response status:', response.status);

    // Return the API response
    return {
      statusCode: response.status,
      body: response.data,
      ...event, // Include original event data for context
    };
  } catch (error) {
    console.error('Error calling Eventbrite API:', error);

    // Handle axios errors
    if (axios.isAxiosError(error) && error.response) {
      return {
        statusCode: error.response.status,
        body: error.response.data,
        error: `API call failed with status ${error.response.status}`,
        ...event,
      };
    }

    // Handle other errors
    throw error;
  }
};
