import { ApolloClient, InMemoryCache, split, createHttpLink } from '@apollo/client';
import { WebSocketLink } from '@apollo/client/link/ws';               // ← from Apollo
import { SubscriptionClient } from 'subscriptions-transport-ws';    // ← the underlying WS client
import { setContext } from '@apollo/client/link/context';
import { getMainDefinition } from '@apollo/client/utilities';

// HTTP link for queries & mutations
const httpLink = createHttpLink({
  uri: import.meta.env.VITE_GRAPHQL_API_URL,
});

// Attach x-api-key on HTTP
const authLink = setContext((_, { headers }) => ({
  headers: {
    ...headers,
    'x-api-key': import.meta.env.VITE_GRAPHQL_API_KEY,
  },
}));

// SubscriptionClient handles the AppSync WS handshake + graphql-ws sub-protocol
const subscriptionClient = new SubscriptionClient(
  import.meta.env.VITE_GRAPHQL_REALTIME_URL!, // wss://<api-id>.appsync-realtime-api…/graphql
  {
    reconnect: true,
    connectionParams: {
      'x-api-key': import.meta.env.VITE_GRAPHQL_API_KEY,
    },
  }
);

// Wrap it in Apollo’s WebSocketLink
const wsLink = new WebSocketLink(subscriptionClient);

// Split based on operation type
const splitLink = split(
  ({ query }) => {
    const def = getMainDefinition(query);
    return def.kind === 'OperationDefinition' && def.operation === 'subscription';
  },
  wsLink,
  authLink.concat(httpLink)
);

export const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});
