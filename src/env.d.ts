/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_MAP_STYLE_URL?: string;
  readonly PUBLIC_MAP_STYLE_URL_LIGHT?: string;
  readonly PUBLIC_SIM_INTERVAL_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
