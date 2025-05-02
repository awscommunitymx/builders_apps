import { describe, it, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
  UpdateCommand
} from '@aws-sdk/lib-dynamodb';

import { handleViewProfile, handleUpdateUser } from '../lambda/graphql-resolver/index';

const ddbMock = mockClient(DynamoDBDocumentClient);

const sampleUser = {
  user_id: 'user-123',
  short_id: 'short-abc',
  pin: 1234,
  first_name: 'John',
  last_name: 'Doe',
  company: 'Acme',
  role: 'Engineer'
};

beforeEach(() => {
  ddbMock.reset();
});

describe('handleViewProfile', () => {
  it('returns user when shortId and pin match', async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [sampleUser] });
    ddbMock.on(PutCommand).resolves({});

    const result = await handleViewProfile('short-abc', 1234, 'viewer-001');

    expect(result).toEqual(sampleUser);
    expect(ddbMock.commandCalls(QueryCommand).length).toBe(1);
    expect(ddbMock.commandCalls(PutCommand).length).toBe(1);
  });

  it('returns null when no user found', async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });

    const result = await handleViewProfile('short-xyz', 1234, 'viewer-001');

    expect(result).toBeNull();
    expect(ddbMock.commandCalls(QueryCommand).length).toBe(1);
  });

  it('throws error when PIN is incorrect', async () => {
    const user = { ...sampleUser, pin: 9999 };
    ddbMock.on(QueryCommand).resolves({ Items: [user] });

    await expect(handleViewProfile('short-abc', 1234, 'viewer-001')).rejects.toThrow('Incorrect PIN');
  });
});

describe('handleUpdateUser', () => {
  it('updates user with provided fields', async () => {
    const updatedUser = { ...sampleUser, first_name: 'Jane' };
    ddbMock.on(UpdateCommand).resolves({ Attributes: updatedUser });

    const result = await handleUpdateUser('user-123', { first_name: 'Jane' });

    expect(result).toEqual(updatedUser);
    const calls = ddbMock.commandCalls(UpdateCommand);
    expect(calls.length).toBe(1);
    expect(calls[0].args[0].input.UpdateExpression).toContain('#n0 = :v0');
  });

  it('throws error if no fields provided', async () => {
    await expect(handleUpdateUser('user-123', {})).rejects.toThrow('No fields to update');
  });
});
