import "./setup-env";
import express from "express";
import request from "supertest";
import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import { resetMockStorage } from "./utils/mockStorage";
import { initializePaymentMock, verifyPaymentMock, resetPaystackMocks } from "./utils/mockPaystack";

let registerRoutes: any;
let server: import("http").Server;
let app: express.Express;

const registerAndLogin = async () => {
  const payload = { name: "Buyer", email: "buyer@example.com", password: "Buy12345" };
  await request(server).post("/api/auth/register").send(payload).expect(201);
  const loginRes = await request(server)
    .post("/api/auth/login")
    .send({ email: payload.email, password: payload.password })
    .expect(200);
  return loginRes.body.token as string;
};

describe("Payments endpoints", () => {
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
    resetPaystackMocks();
  });

  it("requires authentication to purchase credits", async () => {
    await request(server)
      .post("/api/purchase-credits")
      .send({ packageId: "credits_50" })
      .expect(401);
  });

  it("rejects invalid credit packages", async () => {
    const token = await registerAndLogin();

    const response = await request(server)
      .post("/api/purchase-credits")
      .set("Authorization", `Bearer ${token}`)
      .send({ packageId: "invalid_package" })
      .expect(400);

    expect(response.body.error).toBe("Invalid credit package");
    expect(initializePaymentMock).not.toHaveBeenCalled();
  });

  it("initiates Paystack payment for valid package", async () => {
    const token = await registerAndLogin();
    initializePaymentMock.mockResolvedValue({
      success: true,
      data: {
        authorization_url: "https://paystack.test/checkout/123",
        access_code: "ACCESS_CODE",
        reference: "REF123",
      },
    });

    const response = await request(server)
      .post("/api/purchase-credits")
      .set("Authorization", `Bearer ${token}`)
      .send({ packageId: "credits_50" })
      .expect(200);

    expect(initializePaymentMock).toHaveBeenCalled();
    expect(response.body).toMatchObject({
      authorization_url: expect.any(String),
      access_code: expect.any(String),
      reference: expect.any(String),
    });
  });

  it("handles Paystack initialization errors", async () => {
    const token = await registerAndLogin();
    initializePaymentMock.mockResolvedValue({ success: false, error: "Paystack unavailable" });

    const response = await request(server)
      .post("/api/purchase-credits")
      .set("Authorization", `Bearer ${token}`)
      .send({ packageId: "credits_50" })
      .expect(400);

    expect(response.body.error).toBe("Paystack unavailable");
  });

  it("verifies successful payments and updates credits", async () => {
    await registerAndLogin();
    verifyPaymentMock.mockResolvedValue({
      success: true,
      data: {
        metadata: {
          userId: "user_1",
          credits: 200,
        },
      },
    });

    const response = await request(server)
      .get("/api/verify-payment/REF_SUCCESS")
      .expect(200);

    expect(verifyPaymentMock).toHaveBeenCalledWith("REF_SUCCESS");
    expect(response.body).toMatchObject({
      success: true,
      credits: 200,
      message: "200 credits added successfully",
    });
  });

  it("returns error for invalid payment metadata", async () => {
    verifyPaymentMock.mockResolvedValue({
      success: true,
      data: {
        metadata: {
          foo: "bar",
        },
      },
    });

    const response = await request(server)
      .get("/api/verify-payment/REF_INVALID")
      .expect(400);

    expect(response.body).toMatchObject({ success: false, error: "Invalid payment metadata" });
  });

  it("propagates verification failures", async () => {
    verifyPaymentMock.mockResolvedValue({ success: false, error: "Verification failed" });

    const response = await request(server)
      .get("/api/verify-payment/REF_FAIL")
      .expect(200);

    expect(response.body).toMatchObject({ success: false, error: "Verification failed" });
  });
});
