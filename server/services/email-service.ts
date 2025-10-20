import sgMail from "@sendgrid/mail";

export interface ContactNotificationPayload {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string | Date;
}

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const CONTACT_NOTIFICATION_EMAIL =
  process.env.CONTACT_NOTIFICATION_EMAIL || "info@imageupscaler.app";
const CONTACT_FROM_EMAIL =
  process.env.CONTACT_FROM_EMAIL || CONTACT_NOTIFICATION_EMAIL;

let sendGridReady = false;

if (SENDGRID_API_KEY && SENDGRID_API_KEY.length > 0) {
  if (SENDGRID_API_KEY.startsWith("SG.")) {
    try {
      sgMail.setApiKey(SENDGRID_API_KEY);
      sendGridReady = true;
    } catch (error) {
      console.error("Failed to configure SendGrid mail client:", error);
    }
  } else {
    console.warn(
      "SendGrid API key present but missing 'SG.' prefix. Skipping contact notifications."
    );
  }
} else {
  console.warn(
    "SendGrid API key not configured. Contact form notifications will be skipped."
  );
}

export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  userName: string
): Promise<{ sent: boolean; error?: string }> {
  if (process.env.MOCK_MODE === "true") {
    console.log(
      "Skipping password reset email because MOCK_MODE is enabled."
    );
    return { sent: false, error: "mock-mode" };
  }

  if (!sendGridReady) {
    console.warn(
      "Password reset email skipped: SendGrid client not initialized."
    );
    return { sent: false, error: "not-configured" };
  }

  try {
    const resetUrl = `${process.env.APP_URL || 'https://imageupscaler.app'}/reset-password?token=${resetToken}`;
    
    await sgMail.send({
      to: email,
      from: CONTACT_FROM_EMAIL,
      subject: "Reset Your Password - Image Upscaler Pro",
      text: [
        `Hi ${userName},`,
        "",
        "You requested to reset your password for Image Upscaler Pro.",
        "",
        "Click the link below to reset your password:",
        resetUrl,
        "",
        "This link will expire in 1 hour.",
        "",
        "If you didn't request this, please ignore this email.",
        "",
        "Thanks,",
        "Image Upscaler Pro Team"
      ].join("\n"),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Reset Your Password</h2>
          <p>Hi ${userName},</p>
          <p>You requested to reset your password for Image Upscaler Pro.</p>
          <p>Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #7c3aed; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="color: #666; word-break: break-all;">${resetUrl}</p>
          <p style="color: #999; font-size: 14px; margin-top: 30px;">
            This link will expire in 1 hour.
          </p>
          <p style="color: #999; font-size: 14px;">
            If you didn't request this, please ignore this email.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="color: #999; font-size: 12px;">
            Image Upscaler Pro - AI-Powered Digital Art Tools
          </p>
        </div>
      `,
    });

    console.log(`Password reset email sent to ${email}`);
    return { sent: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "unknown error sending email";
    console.error(
      `Failed to send password reset email to ${email}:`,
      error
    );
    return { sent: false, error: errorMessage };
  }
}

export async function sendContactNotificationEmail(
  payload: ContactNotificationPayload
): Promise<{ sent: boolean; error?: string }> {
  if (process.env.MOCK_MODE === "true") {
    console.log(
      "Skipping contact notification email because MOCK_MODE is enabled."
    );
    return { sent: false, error: "mock-mode" };
  }

  if (!sendGridReady) {
    console.warn(
      "Contact notification email skipped: SendGrid client not initialized."
    );
    return { sent: false, error: "not-configured" };
  }

  try {
    const createdAt =
      payload.createdAt instanceof Date
        ? payload.createdAt
        : new Date(payload.createdAt);

    await sgMail.send({
      to: CONTACT_NOTIFICATION_EMAIL,
      from: CONTACT_FROM_EMAIL,
      subject: `[Contact Form] ${payload.subject}`,
      replyTo: payload.email,
      text: [
        "A new contact form submission has been received:",
        `Name: ${payload.name}`,
        `Email: ${payload.email}`,
        `Subject: ${payload.subject}`,
        "Message:",
        payload.message,
        "",
        `Received at: ${createdAt.toISOString()}`,
        `Message ID: ${payload.id}`,
      ].join("\n"),
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${payload.name}</p>
        <p><strong>Email:</strong> <a href="mailto:${payload.email}">${payload.email}</a></p>
        <p><strong>Subject:</strong> ${payload.subject}</p>
        <p><strong>Message:</strong></p>
        <p>${payload.message.replace(/\n/g, "<br />")}</p>
        <hr />
        <p>Received at: ${createdAt.toISOString()}</p>
        <p>Message ID: ${payload.id}</p>
      `,
    });

    console.log(`Contact notification email sent for message ${payload.id}`);
    return { sent: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "unknown error sending email";
    console.error(
      `Failed to send contact notification email for message ${payload.id}:`,
      error
    );
    return { sent: false, error: errorMessage };
  }
}

export async function sendReEngagementEmail(
  email: string,
  userName: string,
  bonusCredits: number = 50
): Promise<{ sent: boolean; error?: string }> {
  if (!sendGridReady) {
    console.warn("SendGrid not configured. Skipping re-engagement email.");
    return { sent: false, error: "sendgrid-not-configured" };
  }

  try {
    await sgMail.send({
      to: email,
      from: CONTACT_FROM_EMAIL,
      subject: "We listened: Major upgrades to Art Studio Pro 🎨",
      text: `Hi ${userName},

You signed up for Art Studio Pro a while back, but we noticed you haven't had a chance to try it yet.

We get it - the first version wasn't perfect. But we've been listening.

🎉 What's New:

✅ Faster AI art generation (Google Imagen 3)
✅ Professional mockup templates (10+ room settings)
✅ One-click background removal (NEW!)
✅ Better user interface & workflow
✅ Improved image quality & upscaling

🚀 Coming Very Soon:
Direct Etsy integration - publish listings with one click!

We'd love for you to give us another shot. Your early feedback helped shape these improvements.

Try it now: https://imageupscaler.app/auth

As an early supporter, you'll get:
• ${bonusCredits} bonus credits (just for logging back in)
• Early access to Etsy integration
• Priority support

Questions? Just reply to this email.

Best,
The Art Studio Pro Team

P.S. We're registering with Etsy's API this week. You'll be first to know when it's live!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6366f1;">We listened: Major upgrades to Art Studio Pro 🎨</h2>
          
          <p>Hi ${userName},</p>
          
          <p>You signed up for Art Studio Pro a while back, but we noticed you haven't had a chance to try it yet.</p>
          
          <p>We get it - the first version wasn't perfect. But we've been listening.</p>
          
          <h3 style="color: #6366f1;">🎉 What's New:</h3>
          <ul style="line-height: 1.8;">
            <li>✅ Faster AI art generation (Google Imagen 3)</li>
            <li>✅ Professional mockup templates (10+ room settings)</li>
            <li>✅ One-click background removal (NEW!)</li>
            <li>✅ Better user interface & workflow</li>
            <li>✅ Improved image quality & upscaling</li>
          </ul>
          
          <h3 style="color: #6366f1;">🚀 Coming Very Soon:</h3>
          <p>Direct Etsy integration - publish listings with one click!</p>
          
          <p>We'd love for you to give us another shot. Your early feedback helped shape these improvements.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://imageupscaler.app/auth" 
               style="background-color: #6366f1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Try It Now
            </a>
          </div>
          
          <h3 style="color: #6366f1;">As an early supporter, you'll get:</h3>
          <ul style="line-height: 1.8;">
            <li>• ${bonusCredits} bonus credits (just for logging back in)</li>
            <li>• Early access to Etsy integration</li>
            <li>• Priority support</li>
          </ul>
          
          <p>Questions? Just reply to this email.</p>
          
          <p>Best,<br>The Art Studio Pro Team</p>
          
          <p style="font-size: 12px; color: #666; margin-top: 30px;">
            P.S. We're registering with Etsy's API this week. You'll be first to know when it's live!
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          
          <p style="font-size: 11px; color: #999;">
            You're receiving this because you signed up for Art Studio Pro. 
            <a href="https://imageupscaler.app/settings" style="color: #6366f1;">Update preferences</a>
          </p>
        </div>
      `,
    });

    console.log(`Re-engagement email sent to ${email}`);
    return { sent: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "unknown error sending email";
    console.error(`Failed to send re-engagement email to ${email}:`, error);
    return { sent: false, error: errorMessage };
  }
}
