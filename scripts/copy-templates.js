import fs from 'fs';
import path from 'path';

// Copy templates directory to dist
const src = 'templates';
const dest = 'dist/templates';

console.log('📂 Copying templates directory...');

if (fs.existsSync(src)) {
  fs.cpSync(src, dest, { recursive: true });
  console.log('✅ Templates copied successfully');
} else {
  console.warn('⚠️ Templates directory not found');
}
