/**
 * Test Re-engagement Email Script
 * 
 * Sends a single test email to verify formatting and content
 * 
 * Usage:
 *   npm run test-email <email> <name>
 * 
 * Example:
 *   npm run test-email leon.lodewyks@gmail.com "Leon"
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables from .env file
config({ path: resolve(process.cwd(), ".env") });

import { sendReEngagementEmail } from "../server/services/email-service";

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error("❌ Usage: npm run test-email <email> <name>");
    console.error("   Example: npm run test-email leon.lodewyks@gmail.com \"Leon\"");
    process.exit(1);
  }

  const email = args[0];
  const name = args[1];
  const bonusCredits = 50;

  console.log("📧 Sending Test Re-engagement Email");
  console.log("====================================");
  console.log(`To: ${email}`);
  console.log(`Name: ${name}`);
  console.log(`Bonus Credits: ${bonusCredits}`);
  console.log("");

  console.log("⏳ Sending email...");

  try {
    const result = await sendReEngagementEmail(email, name, bonusCredits);

    if (result.sent) {
      console.log("✅ Email sent successfully!");
      console.log("");
      console.log("📬 Check your inbox at:", email);
      console.log("📝 Subject: We listened: Major upgrades to Art Studio Pro 🎨");
      console.log("");
      console.log("💡 The email includes:");
      console.log("   • List of new features");
      console.log("   • Etsy integration teaser");
      console.log("   • 50 bonus credits offer");
      console.log("   • Clear call-to-action button");
    } else {
      console.log("❌ Failed to send email");
      console.log("Error:", result.error);
    }
  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
