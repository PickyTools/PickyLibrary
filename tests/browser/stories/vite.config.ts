import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

const source = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
    root: source('.'),
    plugins: [vue()],
    resolve: {
        // Order matters: the stylesheet entry has to come first, or the bare
        // package alias swallows it as a prefix match.
        //
        // Both point at src/ rather than dist/, so a story page always reflects the
        // working tree instead of whatever was built last.
        alias: [
            { find: 'pickylibrary/style.css', replacement: source('../../../src/styles/index.css') },
            { find: 'pickylibrary', replacement: source('../../../src/index.ts') },
        ],
    },
    server: { port: 5199 },
});
