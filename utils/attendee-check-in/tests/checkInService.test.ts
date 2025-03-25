import { storeAttendeeCheckIn } from '../src/checkInService';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { AttendeeCheckIn } from '../src/types';
import {
  ConditionalCheckFailedException,
  ProvisionedThroughputExceededException,
  ResourceNotFoundException,
} from '@aws-sdk/client-dynamodb';

// Mock DynamoDB client
const ddbMock = mockClient(DynamoDBDocumentClient);

// Sample attendee data for tests
const mockAttendee: AttendeeCheckIn = {
  user_id: '123',
  first_name: 'John',
  last_name: 'Doe',
  age_range: '25-34',
  gender: 'Male',
  company: 'Acme Corp',
  area_of_interest: 'Cloud Architecture',
  pin: '1234',
  role: 'Cloud Architect',
  contact_information: {
    email: 'john@example.com',
    phone: '1234567890',
    share_email: true,
    share_phone: false,
  },
  social_links: [{ name: 'LinkedIn', url: 'https://linkedin.com/johndoe' }],
  short_id: 'ABC123',
};

// Constants
const mockTableName = 'AttendeeCheckIns';

describe('storeAttendeeCheckIn', () => {
  beforeEach(() => {
    ddbMock.reset(); // Reset mock state between tests
  });

  it('stores check-in data successfully', async () => {
    ddbMock.onAnyCommand().resolves({});

    await expect(
      storeAttendeeCheckIn(ddbMock as any, mockAttendee, mockTableName)
    ).resolves.not.toThrow();

    expect(ddbMock.calls()).toHaveLength(1);
    expect(ddbMock.calls()[0].args[0].input).toMatchObject({
      TableName: mockTableName,
      Item: expect.objectContaining({
        PK: `USER#${mockAttendee.user_id}`,
        SK: 'PROFILE',
      }),
    });
  });

  it('throws an error if attendee already exists', async () => {
    ddbMock.onAnyCommand().rejects(
      new ConditionalCheckFailedException({
        $metadata: { httpStatusCode: 400 },
        message: 'Item already exists',
      })
    );

    await expect(storeAttendeeCheckIn(ddbMock as any, mockAttendee, mockTableName)).rejects.toThrow(
      'Attendee already checked in.'
    );

    expect(ddbMock.calls()).toHaveLength(1);
  });

  it('throws an error if DynamoDB throughput is exceeded', async () => {
    ddbMock.onAnyCommand().rejects(
      new ProvisionedThroughputExceededException({
        $metadata: { httpStatusCode: 400 },
        message: 'Throughput exceeded',
      })
    );

    await expect(storeAttendeeCheckIn(ddbMock as any, mockAttendee, mockTableName)).rejects.toThrow(
      'Service is busy, please try again later.'
    );

    expect(ddbMock.calls()).toHaveLength(1);
  });

  it('throws an error if DynamoDB table is missing', async () => {
    ddbMock.onAnyCommand().rejects(
      new ResourceNotFoundException({
        $metadata: { httpStatusCode: 400 },
        message: 'Table not found',
      })
    );

    await expect(storeAttendeeCheckIn(ddbMock as any, mockAttendee, mockTableName)).rejects.toThrow(
      'Configuration error: DynamoDB table missing.'
    );

    expect(ddbMock.calls()).toHaveLength(1);
  });

  it('throws a generic error for unknown issues', async () => {
    ddbMock.onAnyCommand().rejects(new Error('Unexpected error'));

    await expect(storeAttendeeCheckIn(ddbMock as any, mockAttendee, mockTableName)).rejects.toThrow(
      'An unexpected error occurred while storing check-in.'
    );

    expect(ddbMock.calls()).toHaveLength(1);
  });
});
