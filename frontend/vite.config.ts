// @ts-ignore
import { defineConfig } from 'vite';
// @ts-ignore
import react from '@vitejs/plugin-react';
// @ts-ignore
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
    ],
    build: {
        outDir: '../assets/build',
        target: 'es2018',
        emptyOutDir: true,
        manifest: 'manifest.json',
        rollupOptions: {
            input: 'src/main.tsx',
            output: {format: 'iife', name: 'WordFlowSheetsUpdaterApp'},
        },
    },
});