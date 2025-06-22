  import { defineConfig } from 'vite';
  import react from '@vitejs/plugin-react';
  import { viteStaticCopy } from 'vite-plugin-static-copy';

  export default defineConfig({
    plugins: [
      react(),
      viteStaticCopy({
        targets: [
          {
            src: 'src/assets/objects/*.{obj,mtl}',
            dest: 'assets/objects'
          },
          {
            src: 'src/assets/sounds/*.mp3',
            dest: 'assets/objects'
          },
          {
            src: 'src/assets/textures/*.{jpg,png}',
            dest: 'assets/textures'
          },
          {
            src: 'src/fonts/*.{ttf,woff,woff2}',
            dest: 'assets/fonts'
          }
        ]
      })
    ],
    base: '/elspirates-mariscal2015/', // Crucial for GitHub Pages
    build: {
      outDir: 'dist',
      assetsInlineLimit: 0, // Ensure fonts aren't inlined
      rollupOptions: {
        output: {
          assetFileNames: (assetInfo) => {
            const extType = assetInfo.name?.split('.').pop()?.toLowerCase() || 'assets';
            const folderMap: Record<string, string> = {
              obj: 'models',
              mtl: 'models',
              jpg: 'textures',
              png: 'textures',
              ttf: 'fonts',
              woff: 'fonts',
              woff2: 'fonts',
              mp3: 'mp3'
            };
            return `assets/${folderMap[extType] || extType}/[name][extname]`; // Removed hash for stability
          }
        }
      }
    },
    assetsInclude: ['**/*.obj', '**/*.mp3', '**/*.mtl', '**/*.ttf', '**/*.woff', '**/*.woff2']
  });