import { gql, useQuery } from '@apollo/client';
import { User } from '@awscommunity/generated-react/hooks';

const GET_USER = gql`
  query GetUserByShortId($shortId: String!) {
    getUserByShortId(shortId: $shortId) {
      user_id
      short_id
      first_name
      last_name
      company
      role
      pin
    }
  }
`;

export interface UserProfileData {
  loading: boolean;
  error?: Error;
  user?: User;
}

export function useUserProfile(shortId: string): UserProfileData {
  const isValidId = shortId && shortId.trim().length > 0;

  const { loading, error, data } = useQuery(GET_USER, {
    variables: { shortId },
    skip: !isValidId,
  });

  return {
    loading,
    error: error ? error : undefined,
    user: data?.getUserByShortId,
  };
}
