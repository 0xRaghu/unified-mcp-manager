#!/usr/bin/env bun
/**
 * Build script for MCP Manager npm package
 */

import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DIST_DIR = 'dist';

// Clean dist directory
if (existsSync(DIST_DIR)) {
  await Bun.$`rm -rf ${DIST_DIR}`;
}
mkdirSync(DIST_DIR, { recursive: true });

console.log('🏗️  Building MCP Manager...');

// Step 1: Build everything using Vite
console.log('🎨 Building frontend with Vite...');
try {
  // Use Vite to build everything properly with Tailwind v4 plugin
  await Bun.$`bunx vite build --mode production --outDir dist-temp --emptyOutDir`;
  
  // Copy the generated files to our dist folder
  const cssFiles = await Bun.$`find dist-temp/assets -name "*.css"`.text();
  const jsFiles = await Bun.$`find dist-temp/assets -name "*.js"`.text();
  
  if (cssFiles.trim()) {
    const cssFile = cssFiles.trim().split('\n')[0];
    await Bun.$`cp "${cssFile}" dist/main.css`;
  }
  
  if (jsFiles.trim()) {
    const jsFile = jsFiles.trim().split('\n')[0];
    await Bun.$`cp "${jsFile}" dist/main.js`;
  }
  
  // Copy index.html and update it
  const indexHtml = readFileSync('dist-temp/index.html', 'utf-8');
  const modifiedHtml = indexHtml.replace(
    /\/assets\/index-[^"]+\.css/g,
    '/main.css'
  ).replace(
    /\/assets\/index-[^"]+\.js/g,
    '/main.js'
  );
  writeFileSync(join(DIST_DIR, 'index.html'), modifiedHtml);
  
  // Clean up temp directory
  await Bun.$`rm -rf dist-temp`;
  
  console.log('✅ Frontend build complete');
} catch (error) {
  console.error('❌ Frontend build failed:', error);
  process.exit(1);
}

// Step 2: Build server files
console.log('🖥️  Building server...');
try {
  const cliBuild = await Bun.build({
    entrypoints: ['./cli.ts'],
    outdir: './dist',
    target: 'bun',
    minify: false,
    external: ['open']
  });

  if (!cliBuild.success) {
    console.error('❌ CLI build failed:', cliBuild.logs);
    process.exit(1);
  }

  console.log('✅ Server build complete');
} catch (error) {
  console.error('❌ Server build failed:', error);
  process.exit(1);
}

// Step 3: Copy lib directory
console.log('📂 Copying lib files...');
try {
  await Bun.$`cp -r lib ${DIST_DIR}/`;
  console.log('✅ Lib files copied');
} catch (error) {
  console.error('❌ Failed to copy lib files:', error);
  process.exit(1);
}

// Step 4: Make CLI executable
console.log('🔧 Making CLI executable...');
try {
  await Bun.$`chmod +x ${DIST_DIR}/cli.js`;
  console.log('✅ CLI made executable');
} catch (error) {
  console.error('❌ Failed to make CLI executable:', error);
}

console.log('🎉 Build complete! Package ready for publishing.');
console.log(`📁 Output directory: ${DIST_DIR}/`);
console.log('📋 Files included:');
console.log('   - cli.js (executable)');
console.log('   - main.js (frontend)');
console.log('   - main.css (styles)');
console.log('   - index.html');
console.log('   - lib/ (storage utilities)');