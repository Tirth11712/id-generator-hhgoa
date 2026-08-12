/**
 * Dev-only: dumps frames from the opening of the intro clip so the logo
 * length can be measured and LOGO_SKIP_SECONDS set accordingly.
 */
import puppeteer from "puppeteer-core";
import path from "node:path";
import fs from "node:fs";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUT = path.resolve("preview-out", "intro-frames");
fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new" });
try {
  const page = await browser.newPage();
  await page.goto("http://localhost:5173/", { waitUntil: "networkidle0" });

  const times = process.argv.slice(2).length
    ? process.argv.slice(2).map(Number)
    : [0, 0.4, 0.8, 1.2, 1.6, 2.0, 2.6, 3.4];
  const frames = await page.evaluate(async (times) => {
    const v = document.createElement("video");
    v.src = "/hh-guy-intro.mp4";
    v.muted = true;
    await new Promise((res, rej) => {
      v.onloadeddata = res;
      v.onerror = () => rej(new Error("video load failed"));
    });
    const c = document.createElement("canvas");
    c.width = 480;
    c.height = Math.round((v.videoHeight / v.videoWidth) * 480);
    const ctx = c.getContext("2d");
    const out = [];
    for (const t of times) {
      v.currentTime = t;
      await new Promise((res) => (v.onseeked = res));
      ctx.drawImage(v, 0, 0, c.width, c.height);
      out.push(c.toDataURL("image/jpeg", 0.8));
    }
    return { duration: v.duration, w: v.videoWidth, h: v.videoHeight, out };
  }, times);

  console.log("duration", frames.duration, "size", frames.w + "x" + frames.h);
  frames.out.forEach((d, i) => {
    fs.writeFileSync(
      path.join(OUT, `t-${String(times[i]).replace(".", "_")}s.jpg`),
      Buffer.from(d.replace(/^data:image\/jpeg;base64,/, ""), "base64"),
    );
  });
  console.log("wrote", fs.readdirSync(OUT).join(", "));
} finally {
  await browser.close();
}
