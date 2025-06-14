import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

const httpLink = createHttpLink({
  uri: import.meta.env.VITE_GRAPHQL_API_URL,
});

const authLink = setContext((_, { headers }) => {
  const apiKey = import.meta.env.VITE_GRAPHQL_API_KEY;
  
  return {
    headers: {
      ...headers,
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    }
  }
});

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
    query: {
      fetchPolicy: 'cache-first',
    },
  },
});

export default client;