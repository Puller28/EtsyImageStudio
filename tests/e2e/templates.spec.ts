import { expect, test } from "@playwright/test";

test.describe("Template catalogue", () => {
  test("lists available mockup templates", async ({ request }) => {
    const response = await request.get("/api/templates", {
      failOnStatusCode: false,
    });

    expect(response.status(), "Templates endpoint should respond 200").toBe(200);

    const payload = await response.json();

    expect(payload).toMatchObject({
      exists: true,
      rooms: expect.any(Object),
    });

    const rooms = Object.entries(payload.rooms ?? {});
    expect(rooms.length, "Expected at least one template category").toBeGreaterThan(0);

    const firstEntry = rooms.find(([, templates]) => (templates as unknown[]).length > 0);
    expect(firstEntry, "Expected at least one mockup template entry").toBeTruthy();

    if (firstEntry) {
      const [roomName, templates] = firstEntry as [string, Array<Record<string, unknown>>];
      expect(roomName).toBeTruthy();
      expect(templates.length).toBeGreaterThan(0);
      expect(templates[0]).toMatchObject({
        id: expect.any(String),
        manifest_present: expect.any(Boolean),
        bg_present: expect.any(Boolean),
      });
      expect(typeof templates[0].preview_url === "string" || templates[0].preview_url === null).toBeTruthy();
    }
  });

  test("template previews are reachable", async ({ request }) => {
    const templatesResponse = await request.get("/api/templates");
    expect(templatesResponse.ok()).toBeTruthy();

    const { rooms } = await templatesResponse.json() as {
      rooms: Record<string, Array<{ id: string }>>;
    };

    const firstRoom = Object.keys(rooms)[0];
    expect(firstRoom, "Expected a room with templates").toBeTruthy();

    const firstTemplate = rooms[firstRoom][0];
    expect(firstTemplate?.id, "Expected template id in first room").toBeTruthy();

    const previewResponse = await request.get(`/api/templates/preview/${firstRoom}/${firstTemplate.id}`, {
      failOnStatusCode: false,
    });

    expect(previewResponse.status(), "Preview endpoint should respond with an image").toBe(200);
    expect(previewResponse.headers()["content-type"]).toMatch(/image/);
  });
});
