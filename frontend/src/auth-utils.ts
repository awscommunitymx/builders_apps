import { COGNITO_DOMAIN, CLIENT_ID, REDIRECT_URI, RESPONSE_TYPE, SCOPES } from './AuthConfig';

export const generateLoginUrl = () => {
  const params = new URLSearchParams({
    response_type: RESPONSE_TYPE,
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
  });
  return `https://${COGNITO_DOMAIN}/login?${params}`;
};
