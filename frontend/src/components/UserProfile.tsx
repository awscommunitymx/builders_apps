import { useState, useEffect } from 'react';
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

export interface UserProfileProps {
  initialId?: string;
  loading?: boolean;
  error?: Error | null;
  user?: User | null;
}

export function UserProfile({ loading = false, error = null, user = null }: UserProfileProps) {
  return (
    <ContentLayout
      header={
        <SpaceBetween size="m">
          <Header variant="h1" description="Enter a short ID to view the user's profile">
            User Profile
          </Header>
        </SpaceBetween>
      }
    >
      <SpaceBetween size="l">
        {error && <Alert type="error">Error loading profile: {error.message}</Alert>}
        {loading && <Alert type="info">Loading profile...</Alert>}
        {user && (
          <Cards
            cardDefinition={{
              header: (item: User) => <Header>{item.name}</Header>,
              sections: [
                {
                  id: 'details',
                  header: 'Profile Details',
                  content: (item: User) => (
                    <SpaceBetween size="s">
                      <TextContent>
                        <strong>Company:</strong> {item.company || 'N/A'}
                      </TextContent>
                      <TextContent>
                        <strong>Role:</strong> {item.job_title || 'N/A'}
                      </TextContent>
                      <TextContent>
                        <strong>Email:</strong> {item.email || 'N/A'}
                      </TextContent>
                      <TextContent>
                        <strong>Cell Phone:</strong> {item.cell_phone || 'N/A'}
                      </TextContent>
                    </SpaceBetween>
                  ),
                },
              ],
            }}
            cardsPerRow={[{ cards: 1, minWidth: 0 }]}
            items={[user]}
            loadingText="Loading profile"
            empty={<TextContent>Enter a short ID to view the user's profile</TextContent>}
          />
        )}
      </SpaceBetween>
    </ContentLayout>
  );
}
