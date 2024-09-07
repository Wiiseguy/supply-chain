import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { readFileSync, writeFileSync } from 'node:fs'

const packageJson = readFileSync('./package.json').toString()
const version = JSON.parse(packageJson).version || 0

const versionInfo = {
    version: version,
    build: new Date().toISOString()
}

writeFileSync('public/build.json', JSON.stringify(versionInfo))

// https://vitejs.dev/config/
export default defineConfig({
    base: '',
    plugins: [vue()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    }
})
