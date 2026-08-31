import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import dts from 'vite-plugin-dts';

export default defineConfig({
    plugins: [
        vue(),
        dts({
            include: ['src'],
            // Tests do not belong in the package a consumer installs.
            exclude: ['src/**/*.test.ts'],
            tsconfigPath: './tsconfig.build.json',
        }),
    ],
    css: {
        /*
         * Lightning CSS instead of the default esbuild pipeline. Needed because the
         * stylesheets use native CSS nesting: esbuild leaves it alone, which would
         * force every consumer onto a nesting-capable browser when flattening it is
         * free. Lightning CSS compiles the nesting away and adds fallbacks for
         * color-mix() and oklch().
         *
         * The targets are the floor implied by the features we cannot compile away,
         * and which are therefore genuinely required of the browser:
         *
         *   :has()          Chrome 105, Firefox 121, Safari 15.4
         *   color-mix()     Chrome 111, Firefox 113, Safari 16.2
         *   cascade layers  Chrome  99, Firefox  97, Safari 15.4
         *
         * Nesting is deliberately absent: Lightning CSS compiles it away, so it need
         * not raise the floor. Do not lower these numbers without revisiting the
         * features above -- too low a target produces CSS that silently does nothing
         * rather than an error.
         */
        transformer: 'lightningcss',
        lightningcss: {
            targets: {
                chrome: 111 << 16,
                firefox: 121 << 16,
                safari: (16 << 16) | (2 << 8),
            },
        },
    },

    resolve: {
        alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    build: {
        lib: {
            entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
            name: 'PickyLibrary',
            formats: ['es'],
            fileName: () => 'pickylibrary.js',
            cssFileName: 'style',
        },
        rollupOptions: {
            // Vue is a peer dependency: never bundle it, or the consumer ends up with
            // a second Vue instance and provide/inject fails silently.
            external: ['vue'],
            output: { globals: { vue: 'Vue' } },
        },
        cssMinify: 'lightningcss',
        sourcemap: true,
        target: 'es2022',
    },
});
