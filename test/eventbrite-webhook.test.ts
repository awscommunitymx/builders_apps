import { handler } from '../lambda/eventbrite-webhook/src/handler';
import * as storeAttendeeCheckIn from '../utils/checkInService';
import * as sqsService from '../lambda/eventbrite-webhook/src/services/sqs';
import * as attendeeUtils from '../lambda/eventbrite-webhook/src/utils/attendee';
import { mockClient } from 'aws-sdk-client-mock';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { beforeAll, beforeEach, describe, expect, it, vitest } from 'vitest';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const secretsMock = mockClient(SecretsManagerClient);
const ddbMock = mockClient(DynamoDBDocumentClient);

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
    vitest.resetModules();
    // Re-set env vars
    process.env.SECRET_NAME = 'fake-secret-name';
    process.env.DYNAMODB_TABLE_NAME = '123';
    process.env.QUEUE_URL = 'https://sqs.amazonaws.com/test-queue';
    secretsMock.reset();
    ddbMock.reset();
  });

  beforeAll(() => {
    vitest.stubEnv('SECRET_NAME', 'fake-secret-name');
    vitest.stubEnv('DYNAMODB_TABLE_NAME', '123');
    vitest.stubEnv('QUEUE_URL', 'https://sqs.amazonaws.com/test-queue');
  });

  it('should handle a successful request', async () => {
    const fakeToken = 'PRIVATE_TOKEN';
    const fakeAttendee = { profile: {}, barcodes: [{ barcode: '12345' }] };

    const extracted = {
      first_name: 'John',
      last_name: 'Doe',
      contact_information: {
        email: 'john.doe@example.com',
        phone: '1234567890',
        share_email: true,
        share_phone: false,
      },
      job_title: 'Engineer',
      company: 'TestCo',
      gender: 'Male',
      user_id: '12345',
      role: 'Engineer',
      age_range: '25-34',
      area_of_interest: 'AI',
      social_links: [],
      pin: '0000',
      short_id: 'ABCD123',
      initialized: false,
    };

    secretsMock.on(GetSecretValueCommand).resolves({ SecretString: fakeToken });

    vitest.spyOn(attendeeUtils, 'fetchAttendeeData').mockResolvedValue(fakeAttendee);
    vitest.spyOn(attendeeUtils, 'extractAndValidateData').mockReturnValue(extracted);
    vitest.spyOn(storeAttendeeCheckIn, 'storeAttendeeCheckIn');
    vitest.spyOn(sqsService, 'sendToSqs').mockResolvedValue({
      success: true,
      message_id: '123',
      sequence_number: 'abc',
    });

    const response = (await handler(mockEvent, mockContext)) as {
      statusCode: number;
      body: string;
    };

    expect(ddbMock.calls()).toHaveLength(1);
    expect(ddbMock.calls()[0].args[0].input).toMatchObject({
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Item: expect.objectContaining({
        PK: `USER#${extracted.user_id}`,
        SK: 'PROFILE',
      }),
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.attendee_data.user_id).toBe('12345');
    expect(body.attendee_data.first_name).toBe('John');
    expect(body.sqs_message_sent.success).toBe(true);
  });

  it('should return 500 if attendee fetch fails', async () => {
    secretsMock.on(GetSecretValueCommand).resolves({ SecretString: 'TOKEN' });
    vitest.spyOn(attendeeUtils, 'fetchAttendeeData').mockRejectedValue(new Error('API error'));

    const response = (await handler(mockEvent, mockContext)) as {
      statusCode: number;
      body: string;
    };

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Internal Server Error');
  });

  it('should return 500 if DynamoDB throws error', async () => {
    const fakeAttendee = { profile: {}, barcodes: [{ barcode: '12345' }] };
    const extracted = {
      first_name: 'John',
      last_name: 'Doe',
      contact_information: {
        email: 'john.doe@example.com',
        phone: '1234567890',
        share_email: true,
        share_phone: false,
      },
      job_title: 'Engineer',
      company: 'TestCo',
      gender: 'Male',
      user_id: '12345',
      role: 'Engineer',
      age_range: '25-34',
      area_of_interest: 'AI',
      social_links: [],
      pin: '0000',
      short_id: 'ABCD123',
      initialized: false,
    };

    secretsMock.on(GetSecretValueCommand).resolves({ SecretString: 'TOKEN' });
    vitest.spyOn(attendeeUtils, 'fetchAttendeeData').mockResolvedValue(fakeAttendee);
    vitest.spyOn(attendeeUtils, 'extractAndValidateData').mockReturnValue(extracted);
    vitest
      .spyOn(storeAttendeeCheckIn, 'storeAttendeeCheckIn')
      .mockRejectedValue(new Error('DynamoDB error'));

    const response = (await handler(mockEvent, mockContext)) as {
      statusCode: number;
      body: string;
    };

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Internal Server Error');
  });
});
