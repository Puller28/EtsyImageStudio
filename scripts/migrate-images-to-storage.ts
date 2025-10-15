#!/usr/bin/env tsx
/**
 * Migration script to move all image blobs from Postgres to object storage
 * 
 * This script:
 * 1. Scans all projects for base64-encoded images
 * 2. Uploads them to Supabase object storage
 * 3. Updates database records with storage paths instead of base64
 * 
 * Usage:
 *   npm run migrate:images
 *   or
 *   tsx scripts/migrate-images-to-storage.ts
 */

import 'dotenv/config';
import { ImageMigrationService } from '../server/services/image-migration-service';

async function main() {
  console.log('🚀 Starting image migration to object storage...\n');

  const migrationService = new ImageMigrationService();

  // Step 1: Get migration status
  console.log('📊 Checking migration status...');
  const status = await migrationService.getMigrationStatus();
  
  console.log(`\n📈 Migration Status:`);
  console.log(`   Total projects: ${status.total}`);
  console.log(`   Need migration: ${status.needsMigration}`);
  console.log(`   Already migrated: ${status.alreadyMigrated}`);
  
  if (status.sampleProjects.length > 0) {
    console.log(`\n📋 Sample projects (first 10):`);
    status.sampleProjects.forEach(p => {
      console.log(`   - ${p.title} (${p.id})`);
      if (p.base64Images.length > 0) {
        console.log(`     Base64 images: ${p.base64Images.join(', ')}`);
      }
      if (p.objectStorageImages.length > 0) {
        console.log(`     Storage images: ${p.objectStorageImages.join(', ')}`);
      }
    });
  }

  if (status.needsMigration === 0) {
    console.log('\n✅ All projects are already migrated!');
    process.exit(0);
  }

  // Step 2: Confirm migration
  console.log(`\n⚠️  About to migrate ${status.needsMigration} projects`);
  console.log('   This will:');
  console.log('   - Upload images to Supabase object storage');
  console.log('   - Update database records with storage paths');
  console.log('   - Keep original base64 as fallback if upload fails');
  
  // In production, you might want to add a confirmation prompt here
  // For now, we'll proceed automatically
  
  // Step 3: Run migration
  console.log('\n🔄 Starting batch migration...\n');
  const batchSize = parseInt(process.env.MIGRATION_BATCH_SIZE || '5');
  const progress = await migrationService.runBatchMigration(batchSize);

  // Step 4: Report results
  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Results:');
  console.log('='.repeat(60));
  console.log(`Total projects processed: ${progress.processedProjects}`);
  console.log(`Total images migrated: ${progress.migratedImages}`);
  console.log(`Errors encountered: ${progress.errors.length}`);
  
  const duration = Date.now() - progress.startTime.getTime();
  const minutes = Math.floor(duration / 60000);
  const seconds = Math.floor((duration % 60000) / 1000);
  console.log(`Duration: ${minutes}m ${seconds}s`);

  if (progress.errors.length > 0) {
    console.log('\n⚠️  Errors:');
    progress.errors.slice(0, 10).forEach((error, i) => {
      console.log(`   ${i + 1}. ${error}`);
    });
    if (progress.errors.length > 10) {
      console.log(`   ... and ${progress.errors.length - 10} more errors`);
    }
  }

  console.log('\n✅ Migration completed!');
  console.log('\n💡 Next steps:');
  console.log('   1. Verify that images are accessible via /objects/* routes');
  console.log('   2. Test ZIP downloads to ensure they fetch from storage');
  console.log('   3. Monitor database size reduction');
  console.log('   4. Check application logs for any issues');
}

main().catch((error) => {
  console.error('\n❌ Migration failed:', error);
  console.error(error.stack);
  process.exit(1);
});
