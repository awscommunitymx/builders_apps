export const COGNITO_DOMAIN = import.meta.env.VITE_COGNITO_USER_POOL_DOMAIN;
export const CLIENT_ID = import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID;
export const REDIRECT_URI = window.location.origin + '/auth/callback';
export const LOGOUT_URI = window.location.origin + '/auth/logout';
export const RESPONSE_TYPE = 'code';
export const SCOPES = ['openid', 'profile', 'email'].join(' ');
