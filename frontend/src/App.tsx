import TopNavigation from '@cloudscape-design/components/top-navigation';
import { ApolloProvider } from '@apollo/client';
import { client } from './apollo-client';
import { UserProfile } from './components/UserProfile';

function App() {
  return (
    <ApolloProvider client={client}>
      <div>
        <UserProfile />
      </div>
    </ApolloProvider>
  );
}

export default App;
