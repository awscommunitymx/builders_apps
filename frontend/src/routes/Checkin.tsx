import React, { useState } from 'react';
import { Button, Input, SpaceBetween, Container, Header, Box } from '@cloudscape-design/components';
import algoliasearch from 'algoliasearch/lite';

// Initialize Algolia client
const searchClient = algoliasearch(
  import.meta.env.VITE_ALGOLIA_APP_ID || '',
  import.meta.env.VITE_ALGOLIA_SEARCH_KEY || ''
);

const index = searchClient.initIndex(import.meta.env.VITE_ALGOLIA_INDEX_NAME || '');

interface Attendee {
  objectID: string;
  name: string;
  email?: string;
  company?: string;
}

const Checkin: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Attendee[]>([]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length > 0) {
      try {
        const { hits } = await index.search(query);
        setSearchResults(hits as Attendee[]);
      } catch (error) {
        console.error('Error searching:', error);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleCheckin = (attendee: Attendee) => {
    console.log('Checkin function called for:', attendee);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Container header={<Header variant="h1">Check-in</Header>}>
        <SpaceBetween size="l">
          <Input
            type="search"
            value={searchQuery}
            onChange={({ detail }) => handleSearch(detail.value)}
            placeholder="Search attendees..."
          />
          {searchResults.length > 0 && (
            <SpaceBetween size="m">
              {searchResults.map((result) => (
                <div
                  key={result.objectID}
                  style={{
                    padding: '16px',
                    borderBottom: '1px solid #eaeded',
                  }}
                >
                  <SpaceBetween size="m" direction="horizontal">
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{result.name}</div>
                      {(result.email || result.company) && (
                        <div style={{ color: '#666', fontSize: '0.9em' }}>
                          {result.email}
                          {result.email && result.company && ' • '}
                          {result.company}
                        </div>
                      )}
                    </div>
                    <Button variant="primary" onClick={() => handleCheckin(result)}>
                      Check In
                    </Button>
                  </SpaceBetween>
                </div>
              ))}
            </SpaceBetween>
          )}
        </SpaceBetween>
      </Container>
    </div>
  );
};

export default Checkin;
