import fs from 'fs';
import path from 'path';
import https from 'https';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Ensure templates exist - download from GitHub if missing
const templatesDir = 'templates';

console.log('📂 Checking templates directory...');

async function ensureTemplates() {
  // Check if templates directory exists and has content
  if (fs.existsSync(templatesDir)) {
    const contents = fs.readdirSync(templatesDir);
    if (contents.length > 0) {
      console.log(`✅ Templates directory exists with ${contents.length} items`);
      return;
    }
  }

  console.log('⚠️ Templates directory is missing or empty');
  console.log('📥 Attempting to restore templates from git...');

  try {
    // Try to restore templates from git
    await execAsync('git checkout HEAD -- templates/');
    console.log('✅ Templates restored from git');
  } catch (error) {
    console.error('❌ Failed to restore templates:', error.message);
    console.log('⚠️ Mockup generation will not be available');
  }
}

await ensureTemplates();
