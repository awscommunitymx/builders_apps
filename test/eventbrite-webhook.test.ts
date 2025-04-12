import { handler } from '../lambda/eventbrite-webhook/src/handler';
import * as dynamodbService from '../lambda/eventbrite-webhook/src/services/dynamodb';
import * as sqsService from '../lambda/eventbrite-webhook/src/services/sqs';
import * as attendeeUtils from '../lambda/eventbrite-webhook/src/utils/attendee';
import { mockClient } from 'aws-sdk-client-mock';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { beforeEach, describe, expect, it, vitest } from 'vitest';

const secretsMock = mockClient(SecretsManagerClient);

const mockEvent = {
  body: JSON.stringify({
    api_url: 'https://api.eventbrite.com/fake-url',
  }),
};

const mockContext = {
  functionName: 'test-func',
} as any;

describe('handler', () => {
  beforeEach(() => {
    process.env.SECRET_NAME = 'fake-secret-name';
    process.env.DYNAMODB_TABLE_NAME = 'test-table';
    process.env.QUEUE_URL = 'https://sqs.amazonaws.com/test-queue';

    secretsMock.reset();
    // jest.clearAllMocks();
    vitest.clearAllMocks();
  });

  it('should handle a successful request', async () => {
    const fakeToken = 'PRIVATE_TOKEN';
    const fakeAttendee = { profile: {}, barcodes: [{ barcode: '12345' }] };
    const extracted = {
      first_name: 'John',
      last_name: 'Doe',
      cell_phone: '1234567890',
      email: 'john.doe@example.com',
      job_title: 'Engineer',
      company: 'TestCo',
      gender: 'Male',
      barcode: '12345',
      initialized: false,
    };

    // Mock Secrets Manager to return a private token.
    secretsMock.on(GetSecretValueCommand).resolves({ SecretString: fakeToken });

    // Mock utility and service functions.
    vitest.spyOn(attendeeUtils, 'fetchAttendeeData').mockResolvedValue(fakeAttendee);
    vitest.spyOn(attendeeUtils, 'extractAndValidateData').mockReturnValue(extracted);
    vitest.spyOn(dynamodbService, 'saveToDynamoDB').mockResolvedValue('Record created or updated');
    vitest
      .spyOn(sqsService, 'sendToSqs')
      .mockResolvedValue({ success: true, message_id: '123', sequence_number: '1' });

    // Call the handler without a callback and cast the result type.
    const response = (await handler(mockEvent, mockContext)) as {
      statusCode: number;
      body: string;
    };

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.attendee_data.barcode).toBe('12345');
    expect(body.db_operation).toBe('Record created or updated');
    expect(body.sqs_message_sent.success).toBe(true);
  });

  it('should return 500 on error', async () => {
    // Mock Secrets Manager to throw an error.
    secretsMock.on(GetSecretValueCommand).rejects(new Error('Secrets error'));

    const response = (await handler(mockEvent, mockContext)) as {
      statusCode: number;
      body: string;
    };
    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Internal Server Error');
  });
});
