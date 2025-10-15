import { expect, test } from "@playwright/test";

test.describe("Public marketing pages", () => {
  test("home hero renders primary CTAs", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { level: 1, name: /Etsy Art/i }),
    ).toBeVisible();
    await expect(page.getByTestId("button-get-started")).toBeVisible();
    await expect(page.getByTestId("button-learn-more")).toBeVisible();

    await expect(
      page.getByRole("heading", { level: 2, name: /Digital Art Success/i }),
    ).toBeVisible();
  });

  test("contact page displays contact form fields", async ({ page }) => {
    await page.goto("/contact");

    await expect(
      page.getByRole("heading", { level: 1, name: "Contact Us" }),
    ).toBeVisible();

    await expect(page.getByLabel("Name")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Subject")).toBeVisible();
    await expect(page.getByLabel("Message")).toBeVisible();
    await expect(page.getByTestId("button-send-message")).toBeVisible();
  });
});
