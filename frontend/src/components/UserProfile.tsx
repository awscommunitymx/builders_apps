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
import { useNavigate } from 'react-router';

export interface UserProfileProps {
  initialId?: string;
  loading?: boolean;
  error?: Error | null;
  user?: User | null;
  onIdChange?: (id: string) => void;
}

export function UserProfile({
  initialId = '',
  loading = false,
  error = null,
  user = null,
  onIdChange,
}: UserProfileProps) {
  const [shortId, setShortId] = useState<string>(initialId);
  const navigate = useNavigate();

  const isValidId = shortId && shortId.trim().length > 0;

  useEffect(() => {
    if (shortId && shortId !== initialId) {
      navigate(`/uid/${shortId}`);
      if (onIdChange) {
        onIdChange(shortId);
      }
    }
  }, [shortId, initialId, navigate, onIdChange]);

  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShortId(e.target.value);
  };

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
            onChange={handleIdChange}
            placeholder="Enter short ID"
            style={{ padding: '8px', width: '200px' }}
          />
        </SpaceBetween>
      }
    >
      <SpaceBetween size="l">
        {shortId && !isValidId && <Alert type="error">Please enter a valid user ID.</Alert>}
        {error && <Alert type="error">Error loading profile: {error.message}</Alert>}
        {loading && <Alert type="info">Loading profile...</Alert>}
        {user && (
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
            items={[user]}
            loadingText="Loading profile"
            empty={<TextContent>Enter a short ID to view the user's profile</TextContent>}
          />
        )}
      </SpaceBetween>
    </ContentLayout>
  );
}
