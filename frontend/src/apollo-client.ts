import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  ApolloLink,
  fromPromise,
} from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { setContext } from '@apollo/client/link/context';
import { COGNITO_DOMAIN, CLIENT_ID } from './AuthConfig';

const httpLink = createHttpLink({
  uri: import.meta.env.VITE_GRAPHQL_API_URL,
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('access_token');
  return {
    headers: {
      ...headers,
      Authorization: token ? `Bearer ${token}` : '',
    },
  };
});

async function refreshTokens(): Promise<string> {
  const refresh_token = localStorage.getItem('refresh_token');
  if (!refresh_token) throw new Error('No refresh token available');

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: CLIENT_ID,
    refresh_token,
  });

  const resp = await fetch(`https://${COGNITO_DOMAIN}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!resp.ok) {
    throw new Error('Failed to refresh token');
  }

  const { access_token, id_token, refresh_token: newRefresh } = await resp.json();

  localStorage.setItem('access_token', access_token);
  localStorage.setItem('id_token', id_token);
  if (newRefresh) localStorage.setItem('refresh_token', newRefresh);

  return access_token;
}

const errorLink = onError(({ networkError, operation, forward }) => {
  const statusCode = (networkError as any)?.statusCode;
  if (statusCode === 401) {
    return fromPromise(
      refreshTokens()
        .then((newAccessToken) => {
          operation.setContext(({ headers = {} }) => ({
            headers: {
              ...headers,
              Authorization: `Bearer ${newAccessToken}`,
            },
          }));
        })
        .catch((err) => {
          console.error('Refresh failed:', err);
          localStorage.clear();
          window.location.assign('/');
          throw err;
        })
    ).flatMap(() => forward(operation));
  }
});

const link = ApolloLink.from([errorLink, authLink, httpLink]);

export const client = new ApolloClient({
  link,
  cache: new InMemoryCache(),
});
