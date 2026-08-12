import puppeteer from "puppeteer-core";
import path from "node:path";
import fs from "node:fs";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const imgPath = path.resolve("src/assets/hh-goa-card-template.jpeg");
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
        
        // Draw red outline boxes at y=500..1000 every 50px with labels
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.fillStyle = 'yellow';
        ctx.font = '20px sans-serif';
        for (let y = 500; y <= 1050; y += 50) {
          ctx.strokeRect(630, y, 380, 40);
          ctx.fillText("y=" + y, 640, y + 25);
        }
        window.drawn = true;
      };
      bg.src = "data:image/jpeg;base64,${base64Bg}";
    </script>
    </body>
    </html>
  `);

  await page.waitForFunction(() => window.drawn === true);
  const png = await page.$eval("#c", c => c.toDataURL("image/png"));
  fs.writeFileSync(path.join(OUT, "y-grid-probe.png"), Buffer.from(png.replace(/^data:image\/png;base64,/, ""), "base64"));
  console.log("Saved y-grid-probe.png");
} finally {
  await browser.close();
}
