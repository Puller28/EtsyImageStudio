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
