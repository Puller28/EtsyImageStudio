#!/usr/bin/env node
// Production start script that uses TSX directly
import { spawn } from 'child_process';

console.log('🚀 Starting production server with TSX...');

const child = spawn('tsx', ['server/index.ts'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' }
});

child.on('error', (error) => {
  console.error('❌ Failed to start production server:', error);
  process.exit(1);
});

child.on('exit', (code) => {
  console.log(`Production server exited with code ${code}`);
  process.exit(code);
});
