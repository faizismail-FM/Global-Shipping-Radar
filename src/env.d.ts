/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_MAP_STYLE_URL?: string;
  readonly PUBLIC_MAP_STYLE_URL_LIGHT?: string;
  readonly PUBLIC_SIM_INTERVAL_MS?: string;
  readonly PUBLIC_DEFAULT_DATA_SOURCE?: string;
  /** Server-only: AISStream.io API key for the relay endpoint. */
  readonly AISSTREAM_API_KEY?: string;
  /** Server-only: override the AISStream WebSocket URL (tests). */
  readonly AISSTREAM_WS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
