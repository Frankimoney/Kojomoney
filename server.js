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

// Check if .next directory exists, if not rebuild
if (!fs.existsSync(nextDir)) {
  console.log('⚠️  .next directory not found. Building...');
  try {
    console.log('Running: npm run build');
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

console.log('Starting Next.js server from:', serverPath);

// Verify the server file exists
if (!fs.existsSync(serverPath)) {
  console.error('ERROR: Server file not found at:', serverPath);
  console.error('Directory contents:');
  if (fs.existsSync(nextDir)) {
    console.error(fs.readdirSync(nextDir));
  } else {
    console.error('.next directory does not exist');
  }
  process.exit(1);
}

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
