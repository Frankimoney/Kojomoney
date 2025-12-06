#!/usr/bin/env node

// Start the Next.js standalone server
const path = require('path');
const { spawn } = require('child_process');

const serverPath = path.join(__dirname, '.next', 'standalone', 'server.js');

console.log('Starting Next.js server from:', serverPath);

const server = spawn('node', [serverPath], {
  cwd: __dirname,
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
