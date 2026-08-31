import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
    plugins: [vue()],
    // The library is a `file:` dependency and therefore a symlink; without dedupe
    // Vite loads two copies of Vue and provide/inject fails silently.
    resolve: { dedupe: ['vue'] },
    optimizeDeps: { exclude: ['pickylibrary'] },
});
