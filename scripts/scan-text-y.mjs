import puppeteer from "puppeteer-core";
import path from "node:path";
import fs from "node:fs";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const imgPath = path.resolve("src/assets/hh-goa-card-template.jpeg");

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--allow-file-access-from-files"],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1440 });
  const base64Bg = fs.readFileSync(imgPath).toString("base64");

  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <body>
    <canvas id="c" width="1080" height="1440"></canvas>
    <script>
      const bg = new Image();
      bg.onload = () => {
        const canvas = document.getElementById('c');
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bg, 0, 0, 1080, 1440);
        
        // Scan column x=700 from y=500 to y=1050 to find text colors (#FFFDD0 cream or yellow or pink)
        const imgData = ctx.getImageData(0, 0, 1080, 1440);
        const data = imgData.data;
        const res = [];
        for (let y = 500; y <= 1050; y += 5) {
          const idx = (y * 1080 + 700) * 4;
          const r = data[idx], g = data[idx+1], b = data[idx+2];
          // Check if color is non-green (R > 100 or G > 100 or not deep green #00341E)
          res.push({ y, r, g, b });
        }
        window.res = res;
      };
      bg.src = "data:image/jpeg;base64,${base64Bg}";
    </script>
    </body>
    </html>
  `);

  await page.waitForFunction(() => window.res !== undefined);
  const res = await page.evaluate(() => window.res);
  console.log("Color Y Scan:", res.filter(c => c.r > 80 || c.g > 100));
} finally {
  await browser.close();
}
