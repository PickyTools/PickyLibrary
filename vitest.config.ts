import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    test: {
        environment: 'happy-dom',
        include: ['src/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            include: ['src/**/*.ts', 'src/**/*.vue'],
            // Type-only files and the entry point hold no branches to cover.
            exclude: ['src/**/*.test.ts', 'src/index.ts', 'src/env.d.ts', 'src/types.ts'],
            reporter: ['text', 'html'],
        },
    },
});
