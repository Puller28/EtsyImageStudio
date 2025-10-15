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
