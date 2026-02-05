import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
import svgr from 'vite-plugin-svgr';

export default defineConfig({
  base: "/",
  plugins: [react(), svgr()],
  build: {
    target: "esnext",
    chunkSizeWarningLimit: 1600,
    cssCodeSplit: true,
    cssMinify: 'lightningcss',
    minify: 'terser',
    outDir: "build",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: (path) => path.split('/').reverse()[path.split('/').reverse().indexOf('node_modules') - 1]
      },
    },
  },
  server: {
    allowedHosts: [
      'livedemo.anweshan.cv'
    ]
  },
  resolve: {
    alias: [
      /* eslint-disable no-undef */
      { find: '@', replacement: path.join(path.resolve(__dirname, 'src')),  }
    
      /* eslint-enable no-undef */
    ]
  }
})
