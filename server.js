#!/usr/bin/env node

// Start the Next.js standalone server
const path = require('path');
const { spawn, execSync } = require('child_process');
const fs = require('fs');

// Determine the project root
let projectRoot = __dirname;
if (projectRoot.endsWith('/src') || projectRoot.endsWith('\\src')) {
  projectRoot = path.dirname(projectRoot);
}

const nextDir = path.join(projectRoot, '.next');
const serverPath = path.join(projectRoot, '.next', 'standalone', 'server.js');

console.log('Project root:', projectRoot);
console.log('Looking for server at:', serverPath);

// Check if .next/standalone exists, if not - rebuild
if (!fs.existsSync(serverPath)) {
  console.log('⚠️  .next/standalone/server.js not found. Building Now...');
  
  try {
    // First ensure node_modules exist
    if (!fs.existsSync(path.join(projectRoot, 'node_modules'))) {
      console.log('📦 Installing dependencies...');
      execSync('npm install', {
        cwd: projectRoot,
        stdio: 'inherit'
      });
    }
    
    // Build the project
    console.log('🔨 Building Next.js app...');
    execSync('npm run build', {
      cwd: projectRoot,
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });
    console.log('✓ Build complete');
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

// Final verification
if (!fs.existsSync(serverPath)) {
  console.error('ERROR: Server file still not found at:', serverPath);
  console.error('Directory contents of .next:');
  const nextDir = path.join(projectRoot, '.next');
  if (fs.existsSync(nextDir)) {
    console.error(fs.readdirSync(nextDir));
  } else {
    console.error('.next directory does not exist');
  }
  process.exit(1);
}

console.log('✓ Starting Next.js server from:', serverPath);

const server = spawn('node', [serverPath], {
  cwd: projectRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: process.env.PORT || 3000
  }
});

server.on('error', (error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

server.on('exit', (code) => {
  process.exit(code);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.kill();
});
