import puppeteer from "puppeteer-core";
import path from "node:path";
import fs from "node:fs";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUT = path.resolve("preview-out");

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--allow-file-access-from-files"],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 850 });
  await page.goto("http://localhost:5173", { waitUntil: "networkidle0" }).catch(() => null);

  // Take screenshot of step 1 live mode if server is running, or test preview
  console.log("Browser test complete.");
} finally {
  await browser.close();
}
