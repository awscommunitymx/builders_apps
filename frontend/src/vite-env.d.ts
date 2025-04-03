/// <reference types="vite/client" />
interface ImportMetaEnv {
  VITE_GRAPHQL_API_URL: string;
  VITE_GRAPHQL_API_KEY: string;
  VITE_ENVIRONMENT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
