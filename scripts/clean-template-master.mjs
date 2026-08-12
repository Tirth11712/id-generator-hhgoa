import puppeteer from "puppeteer-core";
import path from "node:path";
import fs from "node:fs";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const origImgPath = path.resolve("C:\\Users\\Asus\\Downloads\\WhatsApp Image 2026-08-11 at 10.19.05 PM.jpeg");
const targetImgPath = path.resolve("src/assets/hh-goa-card-template.jpeg");

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--allow-file-access-from-files"],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1086, height: 1448 });
  const base64Bg = fs.readFileSync(origImgPath).toString("base64");

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

        const bgGreen = "#00341E";
        ctx.fillStyle = bgGreen;

        // Erase default static text "DEV" next to palm tree icon (y=720 to 780)
        ctx.fillRect(635, 720, 400, 60);

        // Erase default static text "YOUR NAME" next to person icon (y=820 to 880)
        ctx.fillRect(635, 820, 400, 60);

        // Erase default static text "BEACH-ADJACENT SUNRISE-COMMIT SURVIVOR" next to sun icon (y=920 to 1030)
        ctx.fillRect(635, 920, 400, 110);

        window.cleaned = true;
      };
      bg.src = "data:image/jpeg;base64,${base64Bg}";
    </script>
    </body>
    </html>
  `);

  await page.waitForFunction(() => window.cleaned === true);
  const dataUrl = await page.$eval("#c", c => c.toDataURL("image/jpeg", 0.96));
  fs.writeFileSync(targetImgPath, Buffer.from(dataUrl.replace(/^data:image\/jpeg;base64,/, ""), "base64"));
  console.log("Successfully cleaned master template JPEG permanently!");
} finally {
  await browser.close();
}
