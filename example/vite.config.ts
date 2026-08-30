import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
    plugins: [vue()],
    // De library is een `file:`-dependency en dus een symlink; zonder dedupe laadt
    // Vite twee kopieën van Vue en faalt provide/inject stil.
    resolve: { dedupe: ['vue'] },
    optimizeDeps: { exclude: ['pickylibrary'] },
});
