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
  await page.setViewport({ width: 1086, height: 1448 });
  const base64Bg = fs.readFileSync(imgPath).toString("base64");

  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <body>
    <canvas id="c" width="1086" height="1448"></canvas>
    <script>
      const bg = new Image();
      bg.onload = () => {
        const canvas = document.getElementById('c');
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bg, 0, 0, 1086, 1448);

        // Erase default text DEV next to palm icon (x=630 to 1010, y=720 to 770)
        // Erase default text YOUR NAME next to person icon (x=630 to 1010, y=830 to 880)
        // Erase default text BEACH-ADJACENT next to sun icon (x=630 to 1010, y=930 to 1020)
        const bgGreen = "#00341E";
        ctx.fillStyle = bgGreen;

        ctx.fillRect(635, 725, 385, 45);
        ctx.fillRect(635, 835, 385, 45);
        ctx.fillRect(635, 935, 385, 80);

        window.cleaned = true;
      };
      bg.src = "data:image/jpeg;base64,${base64Bg}";
    </script>
    </body>
    </html>
  `);

  await page.waitForFunction(() => window.cleaned === true);
  const dataUrl = await page.$eval("#c", c => c.toDataURL("image/jpeg", 0.95));
  fs.writeFileSync(imgPath, Buffer.from(dataUrl.replace(/^data:image\/jpeg;base64,/, ""), "base64"));
  console.log("Successfully cleaned template JPEG and saved to src/assets/hh-goa-card-template.jpeg");
} finally {
  await browser.close();
}
