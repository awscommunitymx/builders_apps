/// <reference types="vite/client" />
interface ImportMetaEnv {
  VITE_GRAPHQL_API_URL: string;
  VITE_COGNITO_USER_POOL_CLIENT_ID: string;
  VITE_COGNITO_USER_POOL_DOMAIN: string;
  VITE_ENVIRONMENT: string;
  VITE_AUTH_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
