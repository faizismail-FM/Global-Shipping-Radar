// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  // Pages stay static; only routes that opt out (`export const prerender = false`,
  // e.g. the AISStream relay under src/pages/api) become serverless functions.
  output: 'static',
  adapter: vercel({ maxDuration: 30 }),
  vite: {
    plugins: [tailwindcss()],
  },
});
