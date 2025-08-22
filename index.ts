import { readFileSync, existsSync, mkdirSync } from 'fs';
import { fileStorage } from './lib/fileStorage';

// Ensure dist directory exists
if (!existsSync('./dist')) {
  mkdirSync('./dist', { recursive: true });
}

// Build CSS with PostCSS on startup
try {
  await Bun.$`bunx postcss src/index.css -o dist/index.css`;
  console.log('✅ CSS processed with Tailwind');
} catch (error) {
  console.error('❌ PostCSS failed:', error);
}

async function handleApiRoute(req: Request, pathname: string): Promise<Response> {
  const method = req.method;
  
  try {
    if (pathname === '/api/mcps') {
      if (method === 'GET') {
        const mcps = await fileStorage.getMCPs();
        return new Response(JSON.stringify(mcps), {
          headers: { 'Content-Type': 'application/json' }
        });
      } else if (method === 'POST') {
        const mcps = await req.json();
        await fileStorage.saveMCPs(mcps);
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    if (pathname === '/api/profiles') {
      if (method === 'GET') {
        const profiles = fileStorage.getProfiles();
        return new Response(JSON.stringify(profiles), {
          headers: { 'Content-Type': 'application/json' }
        });
      } else if (method === 'POST') {
        const profiles = await req.json();
        fileStorage.saveProfiles(profiles);
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    if (pathname === '/api/settings') {
      if (method === 'GET') {
        const settings = fileStorage.getSettings();
        return new Response(JSON.stringify(settings), {
          headers: { 'Content-Type': 'application/json' }
        });
      } else if (method === 'POST') {
        const settings = await req.json();
        fileStorage.saveSettings(settings);
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    if (pathname === '/api/backups') {
      if (method === 'GET') {
        const backups = fileStorage.getBackups();
        return new Response(JSON.stringify(backups), {
          headers: { 'Content-Type': 'application/json' }
        });
      } else if (method === 'POST') {
        const { description } = await req.json();
        const backup = await fileStorage.createBackup(description);
        return new Response(JSON.stringify(backup), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    if (pathname.startsWith('/api/backups/') && pathname.endsWith('/restore') && method === 'POST') {
      const backupId = pathname.split('/')[3];
      await fileStorage.restoreFromBackup(backupId);
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (pathname === '/api/storage/clear' && method === 'POST') {
      fileStorage.clearAll();
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (pathname === '/api/storage/info' && method === 'GET') {
      const info = fileStorage.getStorageInfo();
      return new Response(JSON.stringify(info), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // API route not found
    return new Response(JSON.stringify({ error: 'API endpoint not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

const server = Bun.serve({
  port: 3000,
  async fetch(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Handle API routes
    if (pathname.startsWith('/api/')) {
      return handleApiRoute(request, pathname);
    }
    
    // Serve the main HTML with updated paths
    if (pathname === '/') {
      const htmlContent = readFileSync('index.html', 'utf-8');
      const devHtml = htmlContent
        .replace('/src/main.tsx', '/main.js')
        .replace('<head>', '<head><link rel="stylesheet" href="/index.css">');
      
      return new Response(devHtml, {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    // Serve the processed CSS
    if (pathname === '/index.css') {
      return new Response(Bun.file('./dist/index.css'), {
        headers: { 'Content-Type': 'text/css' }
      });
    }
    
    // Serve the bundled main.js
    if (pathname === '/main.js') {
      try {
        const result = await Bun.build({
          entrypoints: ['./src/main.tsx'],
          target: 'browser',
          format: 'esm',
          minify: false
        });
        
        if (result.success && result.outputs.length > 0) {
          const js = await result.outputs[0].text();
          return new Response(js, {
            headers: { 'Content-Type': 'application/javascript' }
          });
        }
      } catch (error) {
        console.error('Build error:', error);
      }
      return new Response('Build failed', { status: 500 });
    }
    
    // Serve other static files
    if (pathname.startsWith('/')) {
      const file = Bun.file('.' + pathname);
      if (await file.exists()) {
        return new Response(file);
      }
    }
    
    return new Response('Not Found', { status: 404 });
  }
});

console.log(`🚀 MCP Manager running on http://localhost:${server.port}`);

// Watch for CSS changes and rebuild
if (process.argv.includes('--watch')) {
  const fs = await import('fs');
  fs.watchFile('./src/index.css', async () => {
    try {
      await Bun.$`bunx postcss src/index.css -o dist/index.css`;
      console.log('🔄 CSS rebuilt');
    } catch (error) {
      console.error('CSS rebuild failed:', error);
    }
  });
}