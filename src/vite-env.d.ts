/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Discord Application ID, used by src/discord/sdk.ts when running as a Discord Activity. */
  readonly VITE_DISCORD_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
