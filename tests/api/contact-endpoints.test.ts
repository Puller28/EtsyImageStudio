import "./setup-env";
import express from "express";
import request from "supertest";
import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { resetMockStorage } from "./utils/mockStorage";

const sendContactNotificationEmail = vi.fn(async () => ({
  sent: true,
  error: undefined,
}));

vi.mock("../../server/services/email-service", () => ({
  sendContactNotificationEmail,
}));

let registerRoutes: any;
let server: import("http").Server;
let app: express.Express;

describe("Contact endpoints", () => {
  beforeAll(async () => {
    registerRoutes = (await import("../../server/routes")).registerRoutes;
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    server = await registerRoutes(app);
  });

  afterAll(async () => {
    if (server && server.listening) {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });

  beforeEach(async () => {
    await resetMockStorage();
    sendContactNotificationEmail.mockClear();
  });

  it("stores a contact message and triggers notification email", async () => {
    const payload = {
      name: "Test User",
      email: "user@example.com",
      subject: "Need some help",
      message: "I have a question about your product.",
    };

    const response = await request(server)
      .post("/api/contact")
      .send(payload)
      .expect(201);

    expect(response.body).toMatchObject({
      success: true,
      message: "Message sent successfully! We'll get back to you shortly.",
      emailSent: true,
      emailError: null,
    });

    expect(response.body.id).toBeDefined();
    expect(sendContactNotificationEmail).toHaveBeenCalledTimes(1);
    expect(sendContactNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        id: response.body.id,
        ...payload,
      })
    );
  });

  it("still succeeds when email notification fails", async () => {
    sendContactNotificationEmail.mockResolvedValueOnce({
      sent: false,
      error: "mock-mode",
    });

    const response = await request(server)
      .post("/api/contact")
      .send({
        name: "Offline Email",
        email: "offline@example.com",
        subject: "Hello",
        message: "Testing failure path.",
      })
      .expect(201);

    expect(response.body).toMatchObject({
      success: true,
      emailSent: false,
      emailError: "mock-mode",
    });
  });

  it("rejects invalid submissions", async () => {
    const response = await request(server)
      .post("/api/contact")
      .send({
        name: "X",
        email: "not-an-email",
        subject: "Hi",
        message: "Short",
      })
      .expect(400);

    expect(response.body).toHaveProperty("error", "Invalid form data");
    expect(sendContactNotificationEmail).not.toHaveBeenCalled();
  });
});
