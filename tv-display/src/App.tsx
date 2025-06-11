import { useEffect, useState } from 'react';
import { ApolloProvider } from '@apollo/client';
import { client } from './apollo-client';
import { AppLayout } from '@cloudscape-design/components';
import '@cloudscape-design/global-styles/index.css';
import { AgendaDisplay } from './components/AgendaDisplay';

function App() {
  const location = import.meta.env.VITE_LOCATION;

  if (!location) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        Error: VITE_LOCATION environment variable is not set
      </div>
    );
  }

  return (
    <ApolloProvider client={client}>
      <AppLayout
        content={<AgendaDisplay location={location} />}
        navigationHide={true}
        toolsHide={true}
        headerHide={true}
      />
    </ApolloProvider>
  );
}

export default App; 
