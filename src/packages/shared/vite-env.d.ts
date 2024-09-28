/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_VITEST?: boolean | string
  readonly VITE_QUICKSTART?: boolean | string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}