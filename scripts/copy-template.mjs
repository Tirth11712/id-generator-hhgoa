import fs from "node:fs";
import path from "node:path";

const src = "C:\\Users\\Asus\\Downloads\\WhatsApp Image 2026-08-11 at 10.19.05 PM.jpeg";
const dest = path.resolve("src/assets/hh-goa-card-template.jpeg");

fs.copyFileSync(src, dest);
console.log("Copied new card template to", dest);
