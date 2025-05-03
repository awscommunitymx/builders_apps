import { AdminCreateUserCommandOutput } from '@aws-sdk/client-cognito-identity-provider';

export function sanitizeDomainPrefix(environmentName: string): string {
  const sanitized = environmentName.replace(/[^a-z0-9]/gi, '').toLowerCase();
  const domainPrefix = `profiles-${sanitized}`;
  return domainPrefix.includes('cognito')
    ? domainPrefix.replace('cognito', 'profiles')
    : domainPrefix;
}

export function getAuthUrls(
  environmentName: string,
  appDomain: string | undefined,
  path: string
): string[] {
  if (!appDomain) {
    return [`http://localhost:5173/auth/${path}`];
  }

  if (environmentName === 'production') {
    return [`https://${appDomain}/auth/${path}`];
  }

  return [`https://${appDomain}/auth/${path}`, `http://localhost:5173/auth/${path}`];
}

export function generateAuthDomain(
  environmentName: string,
  hostedZoneName: string
): { authDomain: string; truncated: boolean } {
  if (environmentName === 'production') {
    return {
      authDomain: `auth.${hostedZoneName}`,
      truncated: false,
    };
  }

  const prefix = `auth-${environmentName}`;
  const hostedZoneNameLength = hostedZoneName.length;
  const maxLength = 63;

  if (prefix.length + hostedZoneNameLength + 1 <= maxLength) {
    return {
      authDomain: `${prefix}.${hostedZoneName}`,
      truncated: false,
    };
  }

  const truncatedEnvironmentName = environmentName.slice(
    0,
    maxLength - hostedZoneNameLength - 6 // 6 is length of "auth-" + "."
  );

  return {
    authDomain: `auth-${truncatedEnvironmentName}.${hostedZoneName}`,
    truncated: true,
  };
}

/**
 * Interface for the createCognitoUser function parameters
 */
export interface CreateCognitoUserParams {
  /** The username for the new user (typically same as userId) */
  username: string;
  /** The email address for the new user */
  email: string;
  /** Optional temporary password for the user */
  temporaryPassword?: string;
  /** Optional Cognito group to add the user to */
  group?: string;
  /** Cognito User Pool ID where the user will be created */
  userPoolId: string;
}

/**
 * Creates a new user in the specified Cognito User Pool with verified email
 *
 * @param params - The parameters for creating a Cognito user
 * @returns A promise that resolves to the created user information or undefined if the user already exists
 *
 * @example
 * // Create a basic user with verified email
 * const newUser = await createCognitoUser({
 *   username: 'user123',
 *   email: 'user@example.com',
 *   userPoolId: 'us-east-1_abcdefghi'
 * });
 * console.log('Created user with ID:', newUser.User.Username);
 *
 * @example
 * // Create a user with temporary password and assign to a group
 * const newUser = await createCognitoUser({
 *   username: 'user456',
 *   email: 'another@example.com',
 *   temporaryPassword: 'TempPass123!',
 *   group: 'Builders',
 *   userPoolId: 'us-east-1_abcdefghi'
 * });
 */
export async function createCognitoUser(
  params: CreateCognitoUserParams
): Promise<AdminCreateUserCommandOutput | undefined> {
  // Import the required AWS SDK components
  const {
    CognitoIdentityProviderClient,
    AdminCreateUserCommand,
    AdminAddUserToGroupCommand,
    UsernameExistsException,
    InternalErrorException,
    InvalidParameterException,
    TooManyRequestsException,
    MessageActionType,
  } = await import('@aws-sdk/client-cognito-identity-provider');

  const { username, email, temporaryPassword, group, userPoolId } = params;
  const client = new CognitoIdentityProviderClient();

  try {
    console.log(`Creating user with email "${email}"`);

    // Prepare the command parameters
    const createUserParams = {
      UserPoolId: userPoolId,
      Username: email,
      MessageAction: MessageActionType.SUPPRESS, // Suppress the default welcome email
      UserAttributes: [
        {
          Name: 'email',
          Value: email,
        },
        {
          Name: 'email_verified',
          Value: 'true',
        },
      ],
      ...(temporaryPassword && { TemporaryPassword: temporaryPassword }),
    };

    // Create the user
    const createUserCommand = new AdminCreateUserCommand(createUserParams);
    const response = await client.send(createUserCommand);
    console.log(`User "${email}" created successfully`);

    // If a group was specified, add the user to that group
    if (group) {
      console.log(`Adding user "${email}" to group "${group}"`);
      const addToGroupCommand = new AdminAddUserToGroupCommand({
        UserPoolId: userPoolId,
        Username: email,
        GroupName: group,
      });
      await client.send(addToGroupCommand);
      console.log(`User "${username}" added to group "${group}" successfully`);
    }

    // Return the user information
    return response;
  } catch (error) {
    // Handle specific Cognito errors with appropriate messages
    if (error instanceof UsernameExistsException) {
      console.log(`User "${username}" already exists. Skipping creation.`);
      return undefined;
    } else if (error instanceof InvalidParameterException) {
      console.error(
        `Invalid parameter provided when creating user "${username}": ${error.message}`
      );
      throw error;
    } else if (error instanceof TooManyRequestsException) {
      console.error(`Rate limit exceeded when creating user "${username}": ${error.message}`);
      throw error;
    } else if (error instanceof InternalErrorException) {
      console.error(
        `Internal AWS service error when creating user "${username}": ${error.message}`
      );
      throw error;
    } else {
      // For any other unexpected errors
      console.error(`Error creating Cognito user "${username}":`, error);
      throw error;
    }
  }
}
