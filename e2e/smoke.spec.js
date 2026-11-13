// Browser smoke tests for the public pages. The API is replaced by fixtures (see fixtures.js).
import { test, expect } from "@playwright/test";
import { fixtures } from "./fixtures.js";

test.beforeEach(async ({ page }) => {
  // Third-party scripts aren't needed for these checks
  await page.route(/accounts\.google\.com|checkout\.razorpay\.com/, (route) => route.abort());
  await page.route(/\/api\/v1\//, (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace(/^.*\/api\/v1/, "");
    const body = fixtures[`${req.method()} ${path}`];
    if (body) return route.fulfill({ json: body });
    return route.fulfill({ status: 404, json: { success: false, message: "Not found" } });
  });
});

test("home page shows the hero and a way to start", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Learn the skills teams hire for");
  await expect(page.getByRole("link", { name: /start learning/i }).first()).toBeVisible();
});

test("login page offers email, Google, GitHub and the read-only demo", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /continue with github/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /try as student/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /try as admin/i })).toBeVisible();
});

test("catalogue lists a subject's courses and the filters narrow them", async ({ page }) => {
  await page.goto("/catalog/web-development");
  await expect(page.getByRole("heading", { level: 1, name: "Web Development" })).toBeVisible();
  await expect(page.getByText("JavaScript from Scratch")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Courses \(3\)/ })).toBeVisible();

  await page.getByLabel("Price").selectOption("under1000");
  await expect(page.getByRole("heading", { name: /Courses \(1 of 3\)/ })).toBeVisible();
  await expect(page.getByText("Modern CSS")).toBeVisible();
  await expect(page.getByText("System Design for Beginners")).toHaveCount(0);

  await page.getByLabel("Price").selectOption("3000plus");
  await page.getByLabel("Length").selectOption("short");
  await expect(page.getByText("No courses match these filters")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.getByRole("heading", { name: /Courses \(3\)/ })).toBeVisible();
});

test("playground runs JavaScript and shows the output", async ({ page }) => {
  await page.goto("/playground");
  await page.getByRole("button", { name: /^run$/i }).click();
  await expect(page.getByRole("log", { name: "Output" })).toContainText("Total:");
});

test("certificate verification shows a genuine certificate and rejects unknown IDs", async ({ page }) => {
  await page.goto("/verify/SN-7K4Q-2M9X");
  await expect(page.getByRole("heading", { name: "This certificate is genuine" })).toBeVisible();
  await expect(page.getByText("Priya Nair")).toBeVisible();

  await page.getByLabel("Certificate ID").fill("SN-2222-3333");
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByRole("heading", { name: "No certificate has this ID" })).toBeVisible();
});

test("privacy and terms pages are reachable from the footer", async ({ page }) => {
  await page.goto("/about");
  await page.getByRole("navigation", { name: "Legal" }).getByRole("link", { name: "Privacy Policy" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Privacy Policy" })).toBeVisible();
  await page.getByRole("link", { name: "Terms of Use" }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Terms of Use" })).toBeVisible();
});

test("unknown pages show the not-found page", async ({ page }) => {
  await page.goto("/this-page-does-not-exist");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page).toHaveTitle(/StudyNotion/);
});
