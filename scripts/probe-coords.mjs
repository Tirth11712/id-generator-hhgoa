import puppeteer from "puppeteer-core";
import path from "node:path";
import fs from "node:fs";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const imgPath = path.resolve("src/assets/hh-goa-card-template.jpeg");
const photoPath = path.resolve("src/assets/hero.png");
const OUT = path.resolve("preview-out");

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--allow-file-access-from-files"],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1440 });
  const base64Bg = fs.readFileSync(imgPath).toString("base64");
  const base64Photo = fs.readFileSync(photoPath).toString("base64");

  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head><style>body { margin: 0; background: #000; }</style></head>
    <body>
    <canvas id="c" width="1080" height="1440"></canvas>
    <script>
      const bg = new Image();
      const photo = new Image();
      let loaded = 0;

      function fitText(ctx, text, maxWidth, initialSize, fontFamily, fontWeight) {
        let size = initialSize;
        ctx.font = fontWeight + " " + size + "px " + fontFamily;
        while (ctx.measureText(text).width > maxWidth && size > 12) {
          size -= 1;
          ctx.font = fontWeight + " " + size + "px " + fontFamily;
        }
        return size;
      }

      function drawCard(nameStr, roleStr, titleText) {
        const canvas = document.getElementById('c');
        const ctx = canvas.getContext('2d');
        const mono = '"Space Mono", ui-monospace, monospace';
        const bgGreen = "#00341E";
        const cream = "#FFFDD0";
        const yellow = "#F4BD00";

        // 1. Base template
        ctx.drawImage(bg, 0, 0, 1080, 1440);

        // 2. User photo: Photo Well (px=120, py=320, pw=430, ph=665)
        const px = 120, py = 320, pw = 430, ph = 665, pr = 16;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(px + pr, py);
        ctx.arcTo(px + pw, py, px + pw, py + ph, pr);
        ctx.arcTo(px + pw, py + ph, px, py + ph, pr);
        ctx.arcTo(px, py + ph, px, py, pr);
        ctx.arcTo(px, py, px + pw, py, pr);
        ctx.closePath();

        ctx.fillStyle = "#00331C";
        ctx.fill();
        ctx.clip();

        const pAspect = photo.width / photo.height;
        const wAspect = pw / ph;
        let dw = pw, dh = ph, dx = px, dy = py;
        if (pAspect > wAspect) {
          dw = ph * pAspect;
          dx = px - (dw - pw) / 2;
        } else {
          dh = pw / pAspect;
          dy = py - (dh - ph) / 2;
        }
        ctx.drawImage(photo, dx, dy, dw, dh);
        ctx.restore();

        // 3. Dynamic Text Fields Replacement:
        // Role (if typed) -> replaces default DEV line at y=745, strictly bounded x=630 to 1010
        if (roleStr && roleStr.trim()) {
          ctx.fillStyle = bgGreen;
          ctx.fillRect(630, 715, 380, 50);
          ctx.fillStyle = cream;
          const displayRole = roleStr.toUpperCase();
          const roleSize = fitText(ctx, displayRole, 360, 28, mono, "700");
          ctx.font = "700 " + roleSize + "px " + mono;
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(displayRole, 640, 740);
        }

        // Name (if typed) -> replaces default YOUR NAME line at y=845, strictly bounded x=630 to 1010
        if (nameStr && nameStr.trim()) {
          ctx.fillStyle = bgGreen;
          ctx.fillRect(630, 815, 380, 50);
          ctx.fillStyle = cream;
          const displayName = nameStr.toUpperCase();
          const nameSize = fitText(ctx, displayName, 360, 30, mono, "700");
          ctx.font = "700 " + nameSize + "px " + mono;
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(displayName, 640, 840);
        }

        // Title (if selected/rerolled) -> replaces default title at y=945, strictly bounded x=630 to 1010
        if (titleText && titleText.trim() && titleText !== "BEACH-ADJACENT SUNRISE-COMMIT SURVIVOR") {
          ctx.fillStyle = bgGreen;
          ctx.fillRect(630, 920, 380, 75);
          ctx.fillStyle = yellow;
          ctx.font = "700 18px " + mono;
          ctx.textAlign = "left";
          ctx.textBaseline = "alphabetic";

          const words = titleText.toUpperCase().split(" ");
          const lines = [];
          let cur = "";
          for (const w of words) {
            const next = cur ? (cur + " " + w) : w;
            if (ctx.measureText(next).width > 360 && cur) {
              lines.push(cur);
              cur = w;
            } else cur = next;
          }
          if (cur) lines.push(cur);
          lines.slice(0, 2).forEach((l, i) => {
            ctx.fillText(l, 640, 945 + i * 22);
          });
        }
      }

      function check() {
        loaded++;
        if (loaded === 2) {
          drawCard("tirth", "developer", "SUNSET SHIPPER · ZERO DOWNTIME");
          window.drawn = true;
        }
      }
      bg.src = "data:image/jpeg;base64,${base64Bg}";
      photo.src = "data:image/png;base64,${base64Photo}";
      bg.onload = check;
      photo.onload = check;
    </script>
    </body>
    </html>
  `);

  await page.waitForFunction(() => window.drawn === true);
  const png = await page.$eval("#c", c => c.toDataURL("image/png"));
  fs.writeFileSync(path.join(OUT, "strictly-bounded-card.png"), Buffer.from(png.replace(/^data:image\/png;base64,/, ""), "base64"));
  console.log("Saved strictly-bounded-card.png");
} finally {
  await browser.close();
}
