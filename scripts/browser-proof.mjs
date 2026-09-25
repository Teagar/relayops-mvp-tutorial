import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const baseURL = process.env.RELAYOPS_URL ?? "http://127.0.0.1:5173";
const output = new URL("../docs/screenshots/", import.meta.url).pathname;
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const errors = [];
page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
page.on("pageerror", (error) => errors.push(error.message));

try {
  await page.goto(baseURL, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${output}/05-mvp-desktop-funcional.png`, fullPage: true });
  await page.getByRole("button", { name: "+ New ticket" }).click();
  await page.screenshot({ path: `${output}/06-crud-novo-ticket.png` });
  await page.getByLabel("Title").fill("Production API returning 503");
  await page.getByLabel("Customer").fill("Teagar Company");
  await page.getByLabel("Tag").fill("Platform");
  await page.getByRole("dialog").getByRole("combobox").nth(0).selectOption("critical");
  await page.getByLabel("Assignee").fill("Ops Team");
  await page.getByRole("button", { name: "Create ticket" }).click();
  await page.getByLabel("Search tickets").fill("Teagar");
  await page.getByRole("heading", { name: "Production API returning 503", exact: true }).waitFor();
  await page.screenshot({ path: `${output}/07-ticket-criado-e-filtrado.png` });
  await page.reload({ waitUntil: "networkidle" });
  await page.getByLabel("Search tickets").fill("Teagar");
  await page.getByRole("heading", { name: "Production API returning 503", exact: true }).waitFor();
  const persisted = await page.evaluate(() => localStorage.getItem("relayops.data.v1"));
  if (!persisted?.includes("Production API returning 503")) throw new Error("localStorage persistence proof failed");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel("Search tickets").fill("");
  await page.screenshot({ path: `${output}/08-mvp-mobile-responsivo.png`, fullPage: true });
  if (errors.length) throw new Error(`Browser errors: ${errors.join("; ")}`);
  console.log(JSON.stringify({ result: "pass", baseURL, persisted: true, desktop: "1440x960", mobile: "390x844", consoleErrors: 0 }, null, 2));
} finally {
  await browser.close();
}
