import fs from "node:fs";
import path from "node:path";

const file = path.resolve("src/assets/hh-goa-card-template.jpeg");
const buf = fs.readFileSync(file);

// JPEG dimension header parser
let i = 0;
if (buf[0] === 0xFF && buf[1] === 0xD8) {
  i = 2;
  while (i < buf.length) {
    const marker = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    if (marker === 0xC0 || marker === 0xC2) {
      const h = buf.readUInt16BE(i + 5);
      const w = buf.readUInt16BE(i + 7);
      console.log("JPEG Dimensions:", w, "x", h);
      break;
    }
    i += 2 + len;
  }
}
