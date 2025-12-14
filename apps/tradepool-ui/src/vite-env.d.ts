/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PACKAGE_ID: string
  readonly VITE_REGISTRY_ID: string
  readonly VITE_ADMIN_CAP_ID: string
  readonly VITE_MOMENTUM_VERSION_ID: string
  readonly VITE_NETWORK: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
