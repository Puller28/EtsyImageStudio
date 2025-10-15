import { expect, test } from "@playwright/test";

test.describe("Health endpoints", () => {
  test("GET /health reports application status", async ({ request }) => {
    const response = await request.get("/health");

    expect(response.ok()).toBeTruthy();

    const payload = await response.json();

    expect(payload).toMatchObject({
      status: "ok",
      application: expect.any(String),
    });
    expect(payload).toHaveProperty("database");
    expect(payload).toHaveProperty("fastapi");
    expect(payload).toHaveProperty("timestamp");
  });

  test("GET /ready eventually returns a meaningful status", async ({ request }) => {
    const response = await request.get("/ready", { failOnStatusCode: false });

    expect([200, 503]).toContain(response.status());

    const payload = await response.json();
    expect(payload).toHaveProperty("status");
  });
});
