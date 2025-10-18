import fs from 'fs';
import path from 'path';

const templatesDir = 'templates';
const distTemplatesDir = 'dist/templates';

console.log('📂 Copying templates to dist folder...');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    console.error(`❌ Source directory not found: ${src}`);
    return false;
  }

  // Create destination directory
  fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });
  let fileCount = 0;

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      fileCount++;
    }
  }

  return fileCount;
}

try {
  // Check if source templates exist
  if (!fs.existsSync(templatesDir)) {
    console.error(`❌ Templates directory not found: ${templatesDir}`);
    console.log('⚠️ Mockup generation will not be available');
    process.exit(0); // Don't fail the build
  }

  const contents = fs.readdirSync(templatesDir);
  if (contents.length === 0) {
    console.error('❌ Templates directory is empty');
    console.log('⚠️ Mockup generation will not be available');
    process.exit(0); // Don't fail the build
  }

  console.log(`📂 Found ${contents.length} room directories in templates/`);

  // Copy templates to dist
  const fileCount = copyRecursive(templatesDir, distTemplatesDir);
  console.log(`✅ Copied templates to ${distTemplatesDir} (${fileCount} files)`);

} catch (error) {
  console.error('❌ Failed to copy templates:', error.message);
  console.log('⚠️ Mockup generation will not be available');
  process.exit(0); // Don't fail the build
}
