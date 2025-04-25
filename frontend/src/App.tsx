import { ApolloProvider } from '@apollo/client';
import { client } from './apollo-client';
import UserProfileRoute from './components/UserProfileRoute';

function App() {
  return (
    <ApolloProvider client={client}>
      <div>
        <UserProfileRoute />
      </div>
    </ApolloProvider>
  );
}

export default App;
