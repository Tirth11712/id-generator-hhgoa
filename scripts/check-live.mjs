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
  await page.setViewport({ width: 1280, height: 900 });

  let ok = false;
  try {
    await page.goto("http://localhost:5173", { waitUntil: "networkidle0", timeout: 5000 });
    ok = true;
  } catch {
    try {
      await page.goto("http://localhost:5174", { waitUntil: "networkidle0", timeout: 5000 });
      ok = true;
    } catch {}
  }

  if (ok) {
    await new Promise(r => setTimeout(r, 2500));
    const png = await page.screenshot();
    fs.writeFileSync(path.join(OUT, "live-app-check.png"), png);
    console.log("Saved live-app-check.png");
  }
} finally {
  await browser.close();
}
