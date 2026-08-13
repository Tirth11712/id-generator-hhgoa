import puppeteer from "puppeteer-core";
import path from "node:path";
import fs from "node:fs";

const OUT =
  "C:/Users/Asus/AppData/Local/Temp/claude/C--Users-Asus-Downloads-claude-hacker-hh-goa-builder-id/50d160c2-f06b-4f99-b1ee-4a5cf2525c9b/scratchpad";
const URL_ = "http://localhost:4177/";

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
  args: ["--no-sandbox", "--force-device-scale-factor=1"],
});

async function shoot(photo, viewport, tag, sheet = false) {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("PAGEERROR", tag, e.message));
  page.on("console", (m) => m.type() === "error" && console.log("CONSOLE", tag, m.text()));
  await page.setViewport(viewport);
  await page.goto(URL_, { waitUntil: "networkidle0" });

  if (photo) {
    const input = await page.$('input[type="file"]');
    await input.uploadFile(path.join(OUT, photo));
    await page.type("#hh-name", "Ada Lovelace");
    await page.type("#hh-role", "Full-stack · Rust");
    await new Promise((r) => setTimeout(r, 500));
  }

  // Does the page overflow its own viewport?
  const overflow = await page.evaluate(() => ({
    v: document.documentElement.scrollHeight - window.innerHeight,
    h: document.documentElement.scrollWidth - window.innerWidth,
  }));
  console.log(tag, "overflow", JSON.stringify(overflow));

  await page.screenshot({ path: path.join(OUT, `page-${tag}.png`) });

  if (sheet) {
    const data = await page.evaluate(() => {
      const [front, back] = document.querySelectorAll("canvas");
      const pad = 36, gap = 56, W = 1080, H = 1440;
      const c = document.createElement("canvas");
      c.width = pad * 2 + W * 2 + gap;
      c.height = pad * 2 + H;
      const x = c.getContext("2d");
      x.fillStyle = "#062A20";
      x.fillRect(0, 0, c.width, c.height);
      x.drawImage(front, pad, pad, W, H);
      x.drawImage(back, pad + W + gap, pad, W, H);
      return c.toDataURL("image/png");
    });
    fs.writeFileSync(path.join(OUT, `sheet-${tag}.png`), Buffer.from(data.split(",")[1], "base64"));
  }

  // Flip to the back and shoot again.
  if (photo) {
    const [, backBtn] = await page.$$("button");
    await page.evaluate(() => {
      [...document.querySelectorAll("button")]
        .find((b) => b.textContent.trim().toLowerCase() === "back")
        ?.click();
    });
    void backBtn;
    await new Promise((r) => setTimeout(r, 300));
    await page.screenshot({ path: path.join(OUT, `page-${tag}-back.png`) });
  }

  await page.close();
}

await shoot("portrait.jpg", { width: 1440, height: 900 }, "desktop", true);
await shoot("portrait.jpg", { width: 390, height: 844, isMobile: true, hasTouch: true }, "mobile");
await shoot("portrait.jpg", { width: 360, height: 640, isMobile: true, hasTouch: true }, "small");
await shoot(null, { width: 390, height: 844, isMobile: true, hasTouch: true }, "mobile-empty");

await browser.close();
console.log("ok");
