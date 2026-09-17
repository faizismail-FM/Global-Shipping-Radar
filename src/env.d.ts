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
  /** Server-only: Hapag-Lloyd API Portal application credentials (Track & Trace product). */
  readonly HLAG_CLIENT_ID?: string;
  readonly HLAG_CLIENT_SECRET?: string;
  /** Server-only: override the Hapag-Lloyd API base (tests). */
  readonly HLAG_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
