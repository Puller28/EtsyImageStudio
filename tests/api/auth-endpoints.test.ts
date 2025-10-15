import "./setup-env";
import express from "express";
import request from "supertest";
import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import { resetMockStorage } from "./utils/mockStorage";

let registerRoutes: any;
let server: import("http").Server;
let app: express.Express;

describe("Auth endpoints", () => {
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
  });

  it("registers a new user", async () => {
    const response = await request(server)
      .post("/api/auth/register")
      .send({ name: "Test User", email: "user@example.com", password: "Passw0rd!" })
      .expect(201);

    expect(response.body).toHaveProperty("token");
    expect(response.body.user).toMatchObject({
      email: "user@example.com",
      name: "Test User",
    });
  });

  it("prevents duplicate registration", async () => {
    const payload = { name: "Test", email: "dup@example.com", password: "Secret123" };

    await request(server).post("/api/auth/register").send(payload).expect(201);

    const duplicate = await request(server)
      .post("/api/auth/register")
      .send(payload)
      .expect(409);

    expect(duplicate.body.error).toBe("User already exists with this email");
  });

  it("logs in an existing user", async () => {
    const payload = { name: "Login", email: "login@example.com", password: "Password123" };
    await request(server).post("/api/auth/register").send(payload).expect(201);

    const response = await request(server)
      .post("/api/auth/login")
      .send({ email: payload.email, password: payload.password })
      .expect(200);

    expect(response.body).toHaveProperty("token");
    expect(response.body.user.email).toBe(payload.email);
  });

  it("rejects invalid credentials", async () => {
    const payload = { name: "Invalid", email: "invalid@example.com", password: "Secret!" };
    await request(server).post("/api/auth/register").send(payload).expect(201);

    await request(server)
      .post("/api/auth/login")
      .send({ email: payload.email, password: "WrongPassword" })
      .expect(401);
  });

  it("returns current user when token provided", async () => {
    const payload = { name: "Profile", email: "profile@example.com", password: "Profile123" };
    await request(server).post("/api/auth/register").send(payload).expect(201);

    const loginRes = await request(server)
      .post("/api/auth/login")
      .send({ email: payload.email, password: payload.password })
      .expect(200);

    const token = loginRes.body.token;
    const profileRes = await request(server)
      .get("/api/user")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(profileRes.body.email).toBe(payload.email);
  });
});
