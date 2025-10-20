/**
 * Re-engagement Email Campaign Script
 * 
 * Sends re-engagement emails to inactive users and awards bonus credits
 * 
 * Usage:
 *   npm run send-reengagement [--dry-run] [--limit=10]
 * 
 * Options:
 *   --dry-run: Preview emails without sending
 *   --limit=N: Only send to first N users (for testing)
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables from .env file
config({ path: resolve(process.cwd(), ".env") });

import { db } from "../server/db";
import { users } from "@shared/schema";
import { sendReEngagementEmail } from "../server/services/email-service";
import { sql, lt, or, isNull } from "drizzle-orm";

const BONUS_CREDITS = 50;
const INACTIVE_DAYS = 30; // Users who haven't logged in for 30+ days

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const limitArg = args.find(arg => arg.startsWith("--limit="));
  const limit = limitArg ? parseInt(limitArg.split("=")[1]) : undefined;

  console.log("🚀 Re-engagement Email Campaign");
  console.log("================================");
  console.log(`Mode: ${isDryRun ? "DRY RUN (no emails sent)" : "LIVE"}`);
  console.log(`Bonus Credits: ${BONUS_CREDITS}`);
  console.log(`Inactive Days: ${INACTIVE_DAYS}+`);
  if (limit) console.log(`Limit: ${limit} users`);
  console.log("");

  // Calculate cutoff date
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - INACTIVE_DAYS);

  // Find inactive users
  console.log("📊 Finding inactive users...");
  
  let query = db
    .select({
      id: users.id,
      email: users.email,
      username: users.username,
      credits: users.credits,
      createdAt: users.createdAt,
      lastLogin: users.lastLogin,
    })
    .from(users)
    .where(
      or(
        isNull(users.lastLogin),
        lt(users.lastLogin, cutoffDate)
      )
    )
    .orderBy(users.createdAt);

  if (limit) {
    query = query.limit(limit) as any;
  }

  const inactiveUsers = await query;

  console.log(`Found ${inactiveUsers.length} inactive users\n`);

  if (inactiveUsers.length === 0) {
    console.log("✅ No inactive users found. Campaign complete!");
    return;
  }

  // Preview users
  console.log("👥 Users to contact:");
  console.log("-------------------");
  inactiveUsers.forEach((user, index) => {
    const lastLoginStr = user.lastLogin 
      ? new Date(user.lastLogin).toLocaleDateString()
      : "Never";
    console.log(`${index + 1}. ${user.username} (${user.email})`);
    console.log(`   Last login: ${lastLoginStr} | Current credits: ${user.credits}`);
  });
  console.log("");

  if (isDryRun) {
    console.log("🔍 DRY RUN MODE - No emails sent, no credits awarded");
    console.log("\nTo send emails for real, run without --dry-run flag:");
    console.log("npm run send-reengagement");
    return;
  }

  // Confirm before sending
  console.log("⚠️  WARNING: This will send real emails!");
  console.log("Press Ctrl+C to cancel, or wait 5 seconds to continue...\n");
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Send emails and award credits
  let successCount = 0;
  let failCount = 0;

  console.log("📧 Sending emails...\n");

  for (const user of inactiveUsers) {
    try {
      // Send email
      const result = await sendReEngagementEmail(
        user.email,
        user.username,
        BONUS_CREDITS
      );

      if (result.sent) {
        // Award bonus credits
        await db
          .update(users)
          .set({
            credits: sql`${users.credits} + ${BONUS_CREDITS}`,
            updatedAt: new Date(),
          })
          .where(sql`${users.id} = ${user.id}`);

        console.log(`✅ ${user.email} - Email sent, ${BONUS_CREDITS} credits awarded`);
        successCount++;
      } else {
        console.log(`❌ ${user.email} - Failed: ${result.error}`);
        failCount++;
      }

      // Rate limit: wait 100ms between emails
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.log(`❌ ${user.email} - Error: ${error}`);
      failCount++;
    }
  }

  // Summary
  console.log("\n📊 Campaign Summary");
  console.log("===================");
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📧 Total emails sent: ${successCount}`);
  console.log(`🎁 Total credits awarded: ${successCount * BONUS_CREDITS}`);
  console.log("\n✨ Campaign complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
