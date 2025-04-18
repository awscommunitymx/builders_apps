export const COGNITO_DOMAIN = import.meta.env.VITE_COGNITO_USER_POOL_DOMAIN;
export const CLIENT_ID = import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID;
export const REDIRECT_URI = 'http://localhost:5173/auth/callback';
export const LOGOUT_URI = 'http://localhost:5173/auth/logout';
export const RESPONSE_TYPE = 'code';
export const SCOPES = ['openid', 'profile', 'email'].join(' ');
