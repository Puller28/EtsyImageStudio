import "./setup-env";
import express from "express";
import request from "supertest";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { registerRoutes } from "../../server/routes";

let server: import("http").Server;
let app: express.Express;

describe("Pricing and plan endpoints", () => {
  beforeAll(async () => {
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

  it("returns credit packages", async () => {
    const response = await request(server).get("/api/credit-packages").expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).not.toHaveLength(0);
    expect(response.body[0]).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      credits: expect.any(Number),
      type: expect.any(String),
    });
  });

  it("returns combined plans", async () => {
    const response = await request(server).get("/api/all-plans").expect(200);

    expect(response.body).toHaveProperty("creditPackages");
    expect(response.body).toHaveProperty("subscriptionPlans");
    expect(response.body.creditPackages.length).toBeGreaterThan(0);
    expect(response.body.subscriptionPlans.length).toBeGreaterThan(0);
  });
});
