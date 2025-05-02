import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import { createCognitoUser } from '../utils/cognito';

// Mock the AWS SDK modules
vi.mock('@aws-sdk/client-cognito-identity-provider', async () => {
  const actual = await vi.importActual('@aws-sdk/client-cognito-identity-provider');
  return {
    ...actual,
    CognitoIdentityProviderClient: vi.fn(() => ({
      send: vi.fn(),
    })),
    AdminCreateUserCommand: vi.fn(),
    AdminAddUserToGroupCommand: vi.fn(),
    MessageActionType: {
      SUPPRESS: 'SUPPRESS',
    },
    UsernameExistsException: class UsernameExistsException extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'UsernameExistsException';
      }
    },
    InvalidParameterException: class InvalidParameterException extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'InvalidParameterException';
      }
    },
  };
});

describe('createCognitoUser', () => {
  let mockClient: any;
  let mockSend: Mock;
  let consoleSpy: any;

  beforeEach(() => {
    mockSend = vi.fn();
    mockClient = {
      send: mockSend,
    };

    // Mock console methods to test logging
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };

    // Reset the import to ensure a fresh mock for each test
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create a user with required parameters', async () => {
    const { CognitoIdentityProviderClient, AdminCreateUserCommand, MessageActionType } =
      await import('@aws-sdk/client-cognito-identity-provider');

    // Mock the client implementation
    (CognitoIdentityProviderClient as any).mockImplementation(() => mockClient);

    await createCognitoUser({
      username: 'testuser',
      email: 'test@example.com',
      userPoolId: 'us-east-1_testpool',
    });

    // Verify AdminCreateUserCommand was called with correct parameters
    expect(AdminCreateUserCommand).toHaveBeenCalledWith({
      UserPoolId: 'us-east-1_testpool',
      Username: 'testuser',
      MessageAction: MessageActionType.SUPPRESS,
      UserAttributes: [
        { Name: 'email', Value: 'test@example.com' },
        { Name: 'email_verified', Value: 'true' },
      ],
    });

    // Verify client.send was called
    expect(mockSend).toHaveBeenCalled();

    // Verify logging
    expect(consoleSpy.log).toHaveBeenCalledWith(
      'Creating user with username "testuser" and email "test@example.com"'
    );
    expect(consoleSpy.log).toHaveBeenCalledWith('User "testuser" created successfully');
  });

  it('should create a user with temporary password', async () => {
    const { CognitoIdentityProviderClient, AdminCreateUserCommand, MessageActionType } =
      await import('@aws-sdk/client-cognito-identity-provider');

    // Mock the client implementation
    (CognitoIdentityProviderClient as any).mockImplementation(() => mockClient);

    await createCognitoUser({
      username: 'testuser',
      email: 'test@example.com',
      temporaryPassword: 'TempPass123!',
      userPoolId: 'us-east-1_testpool',
    });

    // Verify AdminCreateUserCommand was called with correct parameters including temporary password
    expect(AdminCreateUserCommand).toHaveBeenCalledWith({
      UserPoolId: 'us-east-1_testpool',
      Username: 'testuser',
      MessageAction: MessageActionType.SUPPRESS,
      UserAttributes: [
        { Name: 'email', Value: 'test@example.com' },
        { Name: 'email_verified', Value: 'true' },
      ],
      TemporaryPassword: 'TempPass123!',
    });
  });

  it('should add the user to a group if specified', async () => {
    const { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminAddUserToGroupCommand } =
      await import('@aws-sdk/client-cognito-identity-provider');

    // Mock the client implementation
    (CognitoIdentityProviderClient as any).mockImplementation(() => mockClient);

    await createCognitoUser({
      username: 'testuser',
      email: 'test@example.com',
      group: 'Builders',
      userPoolId: 'us-east-1_testpool',
    });

    // Verify AdminAddUserToGroupCommand was called with correct parameters
    expect(AdminAddUserToGroupCommand).toHaveBeenCalledWith({
      UserPoolId: 'us-east-1_testpool',
      Username: 'testuser',
      GroupName: 'Builders',
    });

    // Verify client.send was called twice (once for create, once for group assignment)
    expect(mockSend).toHaveBeenCalledTimes(2);

    // Verify group assignment logging
    expect(consoleSpy.log).toHaveBeenCalledWith('Adding user "testuser" to group "Builders"');
    expect(consoleSpy.log).toHaveBeenCalledWith(
      'User "testuser" added to group "Builders" successfully'
    );
  });

  it('should handle username already exists error gracefully', async () => {
    const { CognitoIdentityProviderClient, UsernameExistsException } = await import(
      '@aws-sdk/client-cognito-identity-provider'
    );

    // Mock the client to throw UsernameExistsException
    (CognitoIdentityProviderClient as any).mockImplementation(() => ({
      send: vi.fn().mockRejectedValueOnce(
        new UsernameExistsException({
          $metadata: { httpStatusCode: 400 },
          message: 'User already exists',
        })
      ),
    }));

    await createCognitoUser({
      username: 'existinguser',
      email: 'existing@example.com',
      userPoolId: 'us-east-1_testpool',
    });

    // Verify appropriate logging for existing user
    expect(consoleSpy.log).toHaveBeenCalledWith(
      'User "existinguser" already exists. Skipping creation.'
    );
  });

  it('should throw error for invalid parameters', async () => {
    const { CognitoIdentityProviderClient, InvalidParameterException } = await import(
      '@aws-sdk/client-cognito-identity-provider'
    );

    // Mock the client to throw InvalidParameterException
    (CognitoIdentityProviderClient as any).mockImplementation(() => ({
      send: vi.fn().mockRejectedValueOnce(
        new InvalidParameterException({
          $metadata: { httpStatusCode: 400 },
          message: 'Invalid parameter',
        })
      ),
    }));

    await expect(
      createCognitoUser({
        username: 'invaliduser',
        email: 'invalid@example.com',
        userPoolId: 'us-east-1_testpool',
      })
    ).rejects.toThrow(InvalidParameterException);

    // Verify error logging
    expect(consoleSpy.error).toHaveBeenCalledWith(
      expect.stringContaining('Invalid parameter provided when creating user "invaliduser"')
    );
  });
});
