import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
    plugins: [
        vue(),
        tailwindcss(),
        dts({
            include: ['src'],
            // Tests horen niet in het pakket dat een consument installeert.
            exclude: ['src/**/*.test.ts'],
            tsconfigPath: './tsconfig.build.json',
        }),
    ],
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
            // Vue is een peer dependency: nooit meebundelen, anders krijgt de
            // consument een tweede Vue-instantie en faalt provide/inject stil.
            external: ['vue'],
            output: { globals: { vue: 'Vue' } },
        },
        sourcemap: true,
        target: 'es2022',
    },
});
