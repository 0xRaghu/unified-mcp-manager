#!/usr/bin/env bun
/**
 * Simple build script using Bun bundler instead of Vite
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';

const DIST_DIR = 'dist';

// Clean dist directory
if (existsSync(DIST_DIR)) {
  await Bun.$`rm -rf ${DIST_DIR}`;
}
mkdirSync(DIST_DIR, { recursive: true });

console.log('🏗️  Building MCP Manager with Bun...');

try {
  // Build frontend with Bun
  console.log('🎨 Building frontend with Bun...');
  const result = await Bun.build({
    entrypoints: ['./src/main.tsx'],
    outdir: './dist',
    target: 'browser',
    minify: false,
    splitting: false,
    format: 'esm'
  });

  if (!result.success) {
    console.error('❌ Frontend build failed:', result.logs);
    process.exit(1);
  }

  // Build CSS with PostCSS and Tailwind
  console.log('🎨 Building CSS with Tailwind...');
  try {
    await Bun.$`bunx postcss src/index.css -o dist/index.css`;
    console.log('✅ CSS processed with Tailwind');
  } catch (error) {
    console.log('⚠️  PostCSS failed, copying basic CSS...');
    await Bun.$`cp src/index.css dist/index.css`;
  }

  // Update HTML file to point to built files
  const htmlContent = readFileSync('index.html', 'utf-8');
  const updatedHtml = htmlContent
    .replace('/src/main.tsx', '/main.js')
    .replace('<title>', '<link rel="stylesheet" href="/index.css"><title>');
  
  writeFileSync(`${DIST_DIR}/index.html`, updatedHtml);
  
  console.log('✅ Frontend build complete');

  // Build CLI
  console.log('🖥️  Building CLI...');
  const cliBuild = await Bun.build({
    entrypoints: ['./cli.ts'],
    outdir: './dist',
    target: 'bun',
    minify: false
  });

  if (!cliBuild.success) {
    console.error('❌ CLI build failed:', cliBuild.logs);
    process.exit(1);
  }

  // Copy lib directory
  await Bun.$`cp -r lib ${DIST_DIR}/`;
  
  // Make CLI executable
  await Bun.$`chmod +x ${DIST_DIR}/cli.js`;

  console.log('✅ Build complete!');
} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
}