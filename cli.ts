#!/usr/bin/env bun

/**
 * MCP Manager CLI & Server
 * Command-line interface for launching the MCP Manager UI
 */

import { exec } from 'child_process';
import { join } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { fileStorage } from './lib/fileStorage';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const portFlag = args.findIndex(arg => arg === '--port' || arg === '-p');
const helpFlag = args.includes('--help') || args.includes('-h');
const versionFlag = args.includes('--version') || args.includes('-v');

const DEFAULT_PORT = 3000;

function openBrowser(url: string) {
  const platform = process.platform;
  let command = '';
  
  switch (platform) {
    case 'darwin':
      command = 'open';
      break;
    case 'win32':
      command = 'start';
      break;
    default:
      command = 'xdg-open';
      break;
  }
  
  exec(`${command} ${url}`, (error) => {
    if (error) {
      console.log(`💡 Please open your browser and navigate to ${url}`);
    }
  });
}

function showHelp() {
  console.log(`
MCP Manager - Centralized MCP Configuration Tool

Usage:
  mcp-manager [options]

Options:
  -p, --port <port>    Specify port number (default: ${DEFAULT_PORT})
  -h, --help          Show this help message
  -v, --version       Show version number

Examples:
  mcp-manager                 # Start on default port
  mcp-manager --port 8080     # Start on port 8080
  mcp-manager -p 3001         # Start on port 3001

Once started, the UI will open automatically in your default browser.
Your MCP configurations are stored in ~/.unified-mcp-manager/
`);
}

async function showVersion() {
    try {
      const packagePath = join(__dirname, '..', 'package.json');
      const packageJson = await Bun.file(packagePath).json();
      console.log(`MCP Manager v${packageJson.version}`);
    } catch (e) {
      console.log('MCP Manager (version unknown)');
      console.error(e)
    }
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

async function main() {
  if (helpFlag) {
    showHelp();
    process.exit(0);
  }

  if (versionFlag) {
    await showVersion();
    process.exit(0);
  }

  // Get port from arguments
  let port = DEFAULT_PORT;
  if (portFlag !== -1 && portFlag + 1 < args.length) {
    const portArg = parseInt(args[portFlag + 1], 10);
    if (!isNaN(portArg) && portArg > 0 && portArg <= 65535) {
      port = portArg;
    } else {
      console.error('❌ Invalid port number. Please provide a valid port between 1 and 65535.');
      process.exit(1);
    }
  }

  const DIST_DIR = __dirname; 
  const indexPath = join(DIST_DIR, 'index.html');
  if (!existsSync(indexPath)) {
    console.error('❌ Build files not found. Please run "bun run build" first.');
    process.exit(1);
  }

  console.log('🚀 Starting MCP Manager...');
  
  const server = Bun.serve({
    port: port,
    async fetch(req) {
      const url = new URL(req.url);
      const pathname = url.pathname;
  
      if (pathname.startsWith('/api/')) {
        return handleApiRoute(req, pathname);
      }
  
      if (pathname === '/') {
        return new Response(Bun.file(join(DIST_DIR, 'index.html')), {
          headers: { 'Content-Type': 'text/html' }
        });
      }
  
      const filePath = join(DIST_DIR, pathname);
      if (existsSync(filePath)) {
        return new Response(Bun.file(filePath));
      }
  
      return new Response(Bun.file(join(DIST_DIR, 'index.html')), {
        headers: { 'Content-Type': 'text/html' }
      });
    },
    development: {
      hmr: false,
    },
    error(error) {
        return new Response(`<pre>${error}
${error.stack}</pre>`, {
            headers: {
                "Content-Type": "text/html",
            },
        });
    }
  });

  console.log(`🚀 MCP Manager Server running at http://localhost:${port}`);
  console.log(`📁 Storage location: ~/.unified-mcp-manager`);

  setTimeout(() => {
    const url = `http://localhost:${port}`;
    console.log(`🌐 Opening browser at ${url}`);
    openBrowser(url);
  }, 1000);

  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down server...');
    server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    server.stop();
    process.exit(0);
  });
}

main();