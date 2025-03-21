import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { gql } from '@apollo/client';
import { User } from '@awscommunity/generated-react/hooks';
import '@cloudscape-design/global-styles/index.css';
import {
  Header,
  ContentLayout,
  Cards,
  SpaceBetween,
  TextContent,
  Alert,
} from '@cloudscape-design/components';

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

export function UserProfile() {
  const [shortId, setShortId] = useState<string>('');
  const { loading, error, data } = useQuery(GET_USER, {
    variables: { shortId },
    skip: !shortId,
  });

  return (
    <ContentLayout
      header={
        <SpaceBetween size="m">
          <Header variant="h1" description="Enter a short ID to view the user's profile">
            User Profile
          </Header>
          <input
            type="text"
            value={shortId}
            onChange={(e) => setShortId(e.target.value)}
            placeholder="Enter short ID"
            style={{ padding: '8px', width: '200px' }}
          />
        </SpaceBetween>
      }
    >
      <SpaceBetween size="l">
        {error && <Alert type="error">Error loading profile: {error.message}</Alert>}

        {loading && <Alert type="info">Loading profile...</Alert>}

        {data?.getUserByShortId && (
          <Cards
            cardDefinition={{
              header: (item: User) => (
                <Header>
                  {item.first_name} {item.last_name}
                </Header>
              ),
              sections: [
                {
                  id: 'details',
                  header: 'Profile Details',
                  content: (item: User) => (
                    <SpaceBetween size="s">
                      <TextContent>
                        <strong>User ID:</strong> {item.user_id}
                      </TextContent>
                      <TextContent>
                        <strong>Short ID:</strong> {item.short_id}
                      </TextContent>
                      <TextContent>
                        <strong>Company:</strong> {item.company || 'N/A'}
                      </TextContent>
                      <TextContent>
                        <strong>Role:</strong> {item.role || 'N/A'}
                      </TextContent>
                    </SpaceBetween>
                  ),
                },
              ],
            }}
            cardsPerRow={[{ cards: 1, minWidth: 0 }]}
            items={[data.getUserByShortId]}
            loadingText="Loading profile"
            empty={<TextContent>Enter a short ID to view the user's profile</TextContent>}
          />
        )}
      </SpaceBetween>
    </ContentLayout>
  );
}
