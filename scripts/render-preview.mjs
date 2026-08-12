/**
 * Dev-only visual check: loads the running app, drops a test photo into the
 * file input, and saves both the pre-upload placeholder card and the finished
 * card as PNGs so the layout can be eyeballed without a browser session.
 *
 *   node scripts/render-preview.mjs [photoPath]
 */
import puppeteer from "puppeteer-core";
import path from "node:path";
import fs from "node:fs";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const URL = process.env.APP_URL ?? "http://localhost:5173/";
const OUT = path.resolve("preview-out");
const photo = process.argv[2];

fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--allow-file-access-from-files", "--autoplay-policy=no-user-gesture-required"],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1100, deviceScaleFactor: 1 });
  await page.goto(URL, { waitUntil: "networkidle0", timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  // let the art assets decode and the first canvas paint land
  await new Promise((r) => setTimeout(r, 1200));

  await page.screenshot({ path: path.join(OUT, "01-page-placeholder.png") });
  const canvasPng = async (name) => {
    const data = await page.$eval("canvas", (c) => c.toDataURL("image/png"));
    fs.writeFileSync(
      path.join(OUT, name),
      Buffer.from(data.replace(/^data:image\/png;base64,/, ""), "base64"),
    );
  };
  await canvasPng("02-card-placeholder.png");

  if (photo) {
    await page.type('input[placeholder="Rana Tirth"]', "Rana Tirth");
    await page.type('input[placeholder="dev"]', "full-stack dev");
    const input = await page.$('input[type="file"]');
    await input.uploadFile(path.resolve(photo));
    await new Promise((r) => setTimeout(r, 2500));
    await page.screenshot({ path: path.join(OUT, "03-reveal.png") });
    await canvasPng("04-card-final.png");
  }

  console.log("wrote:", fs.readdirSync(OUT).join(", "));
} finally {
  await browser.close();
}
