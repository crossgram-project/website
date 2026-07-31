import { defineConfig } from 'astro/config'
import react from '@astrojs/react'

export default defineConfig({
  integrations: [react()],
  site: 'https://crossgram.dev',
  output: 'static',
})
