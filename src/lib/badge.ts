export const BADGE_W = 1080;
export const BADGE_H = 1440;

export const BUILDER_TITLES = [
  "BEACH-ADJACENT SUNRISE-COMMIT SURVIVOR",
  "SUNSET SHIPPER · ZERO DOWNTIME",
  "COCONUT COMPILER · SANDY KEYBOARD",
  "MIDNIGHT MERGE LORD OF ANJUNA",
  "TIDE TABLE ARCHITECT",
  "FENI-FUELLED FULL STACKER",
  "PALM TREE PROMPT WIZARD",
  "HAMMOCK OPS ENGINEER",
  "MONSOON REFACTORER",
  "SALT WATER SHIPPER",
];

export function pickBuilderTitle(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return BUILDER_TITLES[h % BUILDER_TITLES.length]!;
}

const GREEN = "#12432F";
const DEEP = "#0B2E20";

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource & { width: number; height: number },
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const ar = img.width / img.height;
  const target = w / h;
  let sw = img.width;
  let sh = img.height;
  let sx = 0;
  let sy = 0;
  if (ar > target) {
    sw = img.height * target;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / target;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startSize: number,
  family: string,
  weight = "900",
) {
  let size = startSize;
  do {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 1;
  } while (size > 12);
  return size;
}

export type BadgeInput = {
  /** null renders the "YOUR PHOTO HERE" placeholder instead of a photo. */
  photo: (CanvasImageSource & { width: number; height: number }) | null;
  art: HTMLImageElement | null;
  guy: HTMLImageElement | null;
  name: string;
  role: string;
  title: string;
};



export function drawBadge(canvas: HTMLCanvasElement, input: BadgeInput) {
  const W = BADGE_W;
  const H = BADGE_H;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  // 1. Base master template card artwork
  if (input.art) {
    ctx.drawImage(input.art, 0, 0, W, H);
  } else {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, DEEP);
    bg.addColorStop(0.55, GREEN);
    bg.addColorStop(1, DEEP);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
  }

  // 2. User photo inside photo frame well (py=320, ph=665 for clearance under guy hands)
  const px = 120;
  const py = 320;
  const pw = 430;
  const ph = 665;

  if (input.photo) {
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, px, py, pw, ph, 16);
    ctx.clip();
    drawCover(ctx, input.photo, px, py, pw, ph);
    ctx.restore();
  }

  const mono = `"Space Mono", ui-monospace, monospace`;
  const CREAM = "#FFFDD0";
  const YELLOW = "#F4BD00";

  // 3. Dynamic Text Fields Section: Render Role, Name, and Title directly onto clean template
  // ROW 1: ROLE (beside palm tree icon at y=740)
  const displayRole = (input.role && input.role.trim()) ? input.role.toUpperCase() : "DEV";
  ctx.fillStyle = CREAM;
  const roleSize = fitText(ctx, displayRole, 360, 28, mono, "700");
  ctx.font = `700 ${roleSize}px ${mono}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(displayRole, 635, 740);

  // ROW 2: NAME (beside person icon at y=840)
  const displayName = (input.name && input.name.trim()) ? input.name.toUpperCase() : "YOUR NAME";
  ctx.fillStyle = CREAM;
  const nameSize = fitText(ctx, displayName, 360, 30, mono, "700");
  ctx.font = `700 ${nameSize}px ${mono}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(displayName, 635, 840);

  // ROW 3: BUILDER TITLE (beside sun icon at y=945)
  const displayTitle = (input.title && input.title.trim()) ? input.title.toUpperCase() : BUILDER_TITLES[0]!;
  ctx.fillStyle = YELLOW;
  ctx.font = `700 18px ${mono}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  const words = displayTitle.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(next).width > 360 && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  lines.slice(0, 2).forEach((l, i) => {
    ctx.fillText(l, 635, 945 + i * 22);
  });
}

export async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  let blob: Blob = file;
  const isHeic =
    /image\/hei[cf]/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
  if (isHeic) {
    const heic2any = (await import("heic2any")).default as (opts: {
      blob: Blob;
      toType?: string;
      quality?: number;
    }) => Promise<Blob | Blob[]>;
    const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
    blob = Array.isArray(out) ? out[0]! : out;
  }
  return loadImage(URL.createObjectURL(blob));
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (src.startsWith("http:") || src.startsWith("https:")) {
      try {
        if (new URL(src).origin !== window.location.origin) {
          img.crossOrigin = "anonymous";
        }
      } catch {
        /* ignore invalid URL parse */
      }
    }
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Retry without crossOrigin if CORS was blocked
      const fallback = new Image();
      fallback.onload = () => resolve(fallback);
      fallback.onerror = () => reject(new Error("Could not read that image"));
      fallback.src = src;
    };
    img.src = src;
  });
}
