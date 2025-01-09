/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_VITEST?: boolean | string
  readonly VITE_QUICKSTART?: boolean | string,
  readonly VITE_ELECTRON_BUILD?: boolean | string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}