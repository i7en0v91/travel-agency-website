/// <reference types="vite/client" />

interface ImportMetaEnv {
  H3_SESSION_ENCRYPTION_KEY: string,
  AUTH_SECRET: string,
  OAUTH_GITHUB_CLIENT_ID: string,
  OAUTH_GITHUB_CLIENT_SECRET: string,
  OAUTH_GOOGLE_CLIENT_ID: string,
  OAUTH_GOOGLE_CLIENT_SECRET: string,
  GOOGLE_RECAPTCHA_SECRETKEY: string,
  VITE_GOOGLE_RECAPTCHA_PUBLICKEY: string,
  VITE_YANDEX_MAPS_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}