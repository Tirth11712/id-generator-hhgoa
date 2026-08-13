/**
 * Card geometry.
 *
 * The master artwork (`hh-goa-card-template.jpeg`) is 1086x1448 — exactly 3:4.
 * We render at 1080x1440 so every template coordinate maps through TPL_SCALE.
 */
export const BADGE_W = 1080;
export const BADGE_H = 1440;

const TPL_W = 1086;
const TPL_H = 1448;
const TPL_SCALE = BADGE_W / TPL_W; // 0.99448

/** Template-space coordinate -> canvas-space coordinate. */
const t = (v: number) => Math.round(v * TPL_SCALE);

/**
 * The photo well: the dark-green interior inside the cream+pink frame of the
 * master artwork. Measured off the template by scanning for the frame edges.
 *   x 111 -> 539, y 293 -> 1038 (template pixels)
 */
const PHOTO = {
  x: t(111),
  y: t(293),
  w: t(539 - 111),
  h: t(1038 - 293),
  r: t(34),
};

/**
 * The clean green band on the right of the artwork, below the #FRAMEINGOA pill
 * and above the beach illustration. Everything textual lives inside this box.
 */
const TEXT = {
  x: t(618),
  bottom: t(1040),
  maxW: t(1010 - 618),
  /**
   * Fixed baselines rather than accumulated offsets — the artwork underneath
   * never moves, so the rows shouldn't either. Row 1 starts clear of the
   * #FRAMEINGOA pill, which bottoms out at template y=672.
   */
  rows: {
    nameLabel: t(722),
    nameValue: t(768),
    roleLabel: t(832),
    roleValue: t(872),
    titleLabel: t(930),
    titleValue: t(966),
  },
};

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

const CREAM = "#F6EEDC";
const YELLOW = "#F5C542";
const PINK = "#CE1C58";
const GREEN = "#0E4534";
const DEEP = "#062A20";
const INK = "#101010";
export { INK };
const MONO = `"Space Mono", ui-monospace, SFMono-Regular, Menlo, monospace`;

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

/**
 * Cover-fit any source image into the target box.
 *
 * Users will not pre-crop, so when we have to crop vertically we bias the
 * window toward the top of the frame — in real photos the face sits above
 * centre, and a straight 50/50 centre crop decapitates portraits.
 */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource & { width: number; height: number },
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const srcAR = img.width / img.height;
  const dstAR = w / h;
  let sw = img.width;
  let sh = img.height;
  let sx = 0;
  let sy = 0;

  if (srcAR > dstAR) {
    // Source is wider than the well: crop the sides, keep the middle.
    sw = img.height * dstAR;
    sx = (img.width - sw) / 2;
  } else {
    // Source is taller than the well: crop top/bottom, favouring the head.
    sh = img.width / dstAR;
    const overflow = img.height - sh;
    // Landscape-ish originals get a gentler bias than tall phone portraits.
    const bias = srcAR >= 1 ? 0.42 : 0.3;
    sy = overflow * bias;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

/** Shrink `size` until `text` fits `maxWidth`. */
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startSize: number,
  minSize = 14,
  weight = "700",
  family = MONO,
) {
  let size = startSize;
  while (size > minSize) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 1;
  }
  ctx.font = `${weight} ${size}px ${family}`;
  return size;
}

/** Centred all-caps kicker with manual letter-spacing. */
function tracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  size: number,
  gap: number,
  color: string,
) {
  ctx.font = `700 ${size}px ${MONO}`;
  ctx.fillStyle = color;
  ctx.textAlign = "left";
  const total =
    [...text].reduce((w, ch) => w + ctx.measureText(ch).width + gap, 0) - gap;
  let x = cx - total / 2;
  for (const ch of text) {
    ctx.fillText(ch, x, y);
    x += ctx.measureText(ch).width + gap;
  }
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = [];
  let cur = "";
  for (const word of text.split(/\s+/)) {
    const next = cur ? `${cur} ${word}` : word;
    if (cur && ctx.measureText(next).width > maxWidth) {
      lines.push(cur);
      cur = word;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Small all-caps kicker above each value, in the event-badge style. */
function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
  ctx.font = `700 17px ${MONO}`;
  ctx.fillStyle = YELLOW;
  ctx.globalAlpha = 0.72;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  // Manual letter-spacing: ctx.letterSpacing is not supported everywhere.
  let cx = x;
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + 4;
  }
  ctx.globalAlpha = 1;
}

function rule(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  color: string,
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.stroke();
}

export type BadgeInput = {
  /** null leaves the artwork's own "YOUR PHOTO HERE" placeholder visible. */
  photo: (CanvasImageSource & { width: number; height: number }) | null;
  /** The master template artwork; null falls back to a plain brand gradient. */
  art: HTMLImageElement | null;
  name: string;
  role: string;
  title: string;
};

export function drawBadge(canvas: HTMLCanvasElement, input: BadgeInput) {
  const W = BADGE_W;
  const H = BADGE_H;
  if (canvas.width !== W) canvas.width = W;
  if (canvas.height !== H) canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, W, H);
  ctx.imageSmoothingQuality = "high";

  // 1 — Master artwork underneath everything.
  if (input.art) {
    ctx.drawImage(input.art, 0, 0, W, H);
  } else {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, DEEP);
    bg.addColorStop(0.55, GREEN);
    bg.addColorStop(1, DEEP);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = PINK;
    roundRect(ctx, PHOTO.x - 14, PHOTO.y - 14, PHOTO.w + 28, PHOTO.h + 28, PHOTO.r + 14);
    ctx.fill();
  }

  // 2 — Photo fills the well, covering the artwork's dashed placeholder marks.
  //     Clipped to the well's rounded rect so it sits *inside* the pink frame
  //     rather than being pasted on top of it.
  if (input.photo) {
    ctx.save();
    roundRect(ctx, PHOTO.x, PHOTO.y, PHOTO.w, PHOTO.h, PHOTO.r);
    ctx.clip();
    ctx.fillStyle = DEEP;
    ctx.fillRect(PHOTO.x, PHOTO.y, PHOTO.w, PHOTO.h);
    drawCover(ctx, input.photo, PHOTO.x, PHOTO.y, PHOTO.w, PHOTO.h);
    ctx.restore();
  }

  // 3 — Identity block, laid out top-down inside the safe green band.
  const x = TEXT.x;
  const maxW = TEXT.maxW;
  const row = TEXT.rows;

  const displayName = (input.name.trim() || "YOUR NAME").toUpperCase();
  const displayRole = (input.role.trim() || "YOUR STACK").toUpperCase();
  const displayTitle = (input.title.trim() || BUILDER_TITLES[0]!).toUpperCase();

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  // NAME
  label(ctx, "NAME", x, row.nameLabel);
  fitText(ctx, displayName, maxW, 46, 20);
  ctx.fillStyle = CREAM;
  ctx.fillText(displayName, x, row.nameValue);
  rule(ctx, x, row.nameValue + 14, Math.min(ctx.measureText(displayName).width, maxW), CREAM);

  // STACK / ROLE
  label(ctx, "STACK / ROLE", x, row.roleLabel);
  fitText(ctx, displayRole, maxW, 34, 18);
  ctx.fillStyle = CREAM;
  ctx.fillText(displayRole, x, row.roleValue);
  rule(ctx, x, row.roleValue + 13, Math.min(ctx.measureText(displayRole).width, maxW), CREAM);

  // BUILDER TITLE — wraps to at most 3 lines, shrinking until the block plus
  // its underline clears the beach illustration at the bottom of the band.
  label(ctx, "BUILDER TITLE", x, row.titleLabel);

  let titleSize = 28;
  let lines: string[] = [];
  let lineH = 0;
  while (titleSize > 14) {
    ctx.font = `700 ${titleSize}px ${MONO}`;
    lines = wrap(ctx, displayTitle, maxW).slice(0, 3);
    lineH = Math.round(titleSize * 1.3);
    if (row.titleValue + (lines.length - 1) * lineH + 12 <= TEXT.bottom) break;
    titleSize -= 1;
  }
  ctx.fillStyle = YELLOW;
  lines.forEach((line, i) => {
    const ly = row.titleValue + i * lineH;
    ctx.fillText(line, x, ly);
    const lineW = Math.min(ctx.measureText(line).width, maxW);
    rule(ctx, x, ly + 10, lineW, YELLOW);
  });
}

/** Stable per-builder pass number, so the back reads like a real credential. */
export function passId(seed: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `HHG26-${h.toString(36).toUpperCase().padStart(6, "0").slice(-6)}`;
}

/**
 * The reverse of the badge.
 *
 * It borrows the master artwork's own bamboo header and beach/floral footer
 * strips so the two sides read as one printed object, then states the
 * credential on a cream panel in the same frame language as the front.
 */
export function drawBadgeBack(canvas: HTMLCanvasElement, input: BadgeInput) {
  const W = BADGE_W;
  const H = BADGE_H;
  if (canvas.width !== W) canvas.width = W;
  if (canvas.height !== H) canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, W, H);
  ctx.imageSmoothingQuality = "high";

  // Deep tropical background fill
  ctx.fillStyle = DEEP;
  ctx.fillRect(0, 0, W, H);

  // Background artwork header & footer if present
  if (input.art) {
    const src = input.art;
    const sx = src.naturalWidth || src.width;
    const sy = src.naturalHeight || src.height;
    const k = sy / TPL_H;

    const topH = t(140);
    const sliceX = 620;
    const sliceW = TPL_W - sliceX;
    ctx.drawImage(src, sliceX * k, 0, sliceW * k, 140 * k, 0, 0, W / 2 + 1, topH);
    ctx.save();
    ctx.translate(W, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(src, sliceX * k, 0, sliceW * k, 140 * k, 0, 0, W / 2 + 1, topH);
    ctx.restore();

    // Beach scene + palm trees along the bottom (starts at Y=1040 for full visibility)
    const footTplY = 1040;
    const footH = t(TPL_H - footTplY);
    ctx.drawImage(
      src,
      0,
      footTplY * k,
      sx,
      (TPL_H - footTplY) * k,
      0,
      H - footH,
      W,
      footH,
    );
  }

  const cx = W / 2;

  // Header Branding
  tracked(ctx, "OFFICIAL BUILDER CREDENTIAL", cx, t(160), 20, 5, YELLOW);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const displayFont = `"Archivo Black", ${MONO}`;

  ctx.fillStyle = CREAM;
  fitText(ctx, "HACKER HOUSE GOA", t(900), 72, 34, "400", displayFont);
  ctx.textAlign = "center";
  ctx.fillText("HACKER HOUSE GOA", cx, t(230));

  // Pill badge
  ctx.font = `700 ${t(28)}px ${MONO}`;
  const tag = "#FRAMEINGOA · 2026";
  const tagW = ctx.measureText(tag).width;
  const pillW = tagW + t(60);
  const pillH = t(54);
  const pillY = t(256);
  ctx.fillStyle = PINK;
  roundRect(ctx, cx - pillW / 2, pillY, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.fillStyle = CREAM;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(tag, cx, pillY + pillH / 2 + 1);

  // Main Credential Card Container
  const cardW = t(920);
  const cardH = t(650);
  const cardX = cx - cardW / 2;
  const cardY = t(330);
  const cardR = t(28);

  // Card Outer Shadow / Border
  ctx.fillStyle = PINK;
  roundRect(ctx, cardX - 6, cardY - 6, cardW + 12, cardH + 12, cardR + 6);
  ctx.fill();

  // Card Body (Restored Cream/White fill)
  ctx.fillStyle = CREAM;
  roundRect(ctx, cardX, cardY, cardW, cardH, cardR);
  ctx.fill();

  const px = cardX + t(44);
  const innerW = cardW - t(88);
  ctx.textBaseline = "alphabetic";

  const displayName = (input.name.trim() || "BUILDER NAME").toUpperCase();
  const displayRole = (input.role.trim() || "BUILDER STACK").toUpperCase();
  const displayTitle = (input.title.trim() || BUILDER_TITLES[0]!).toUpperCase();
  const pid = passId(`${input.name}|${input.role}|${input.title}`);

  let cy = cardY + t(50);

  // Section 1: BUILDER NAME
  ctx.font = `700 ${t(15)}px ${MONO}`;
  ctx.fillStyle = GREEN;
  ctx.globalAlpha = 0.65;
  ctx.textAlign = "left";
  ctx.fillText("VERIFIED BUILDER", px, cy);
  ctx.globalAlpha = 1.0;

  cy += t(44);
  fitText(ctx, displayName, innerW, 46, 22, "700", MONO);
  ctx.fillStyle = INK;
  ctx.textAlign = "left";
  ctx.fillText(displayName, px, cy);

  // Divider
  cy += t(24);
  ctx.strokeStyle = "rgba(16,16,16,0.15)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px, cy);
  ctx.lineTo(px + innerW, cy);
  ctx.stroke();

  // Section 2: TITLE (Highlight Box)
  cy += t(34);
  ctx.font = `700 ${t(15)}px ${MONO}`;
  ctx.fillStyle = GREEN;
  ctx.globalAlpha = 0.65;
  ctx.fillText("HONORARY TITLE", px, cy);
  ctx.globalAlpha = 1.0;

  cy += t(36);
  let ts = 24;
  let lines: string[] = [];
  while (ts > 14) {
    ctx.font = `700 ${ts}px ${MONO}`;
    lines = wrap(ctx, displayTitle, innerW - t(36));
    if (lines.length <= 2) break;
    ts -= 1;
  }
  lines = lines.slice(0, 2);
  const lineH = Math.round(ts * 1.28);
  const titleBoxH = lines.length * lineH + t(20);

  // Title Box Fill (Deep Green Accent Container)
  ctx.fillStyle = DEEP;
  roundRect(ctx, px, cy - t(22), innerW, titleBoxH, t(14));
  ctx.fill();

  ctx.fillStyle = YELLOW;
  ctx.textAlign = "left";
  lines.forEach((line, i) => {
    ctx.fillText(line, px + t(18), cy + i * lineH + t(4));
  });

  cy += titleBoxH + t(26);

  // Section 3: STACK / ROLE & PASS ID (2 Columns)
  const col1W = innerW * 0.58;
  const col2X = px + innerW * 0.62;
  const col2W = innerW * 0.38;

  ctx.font = `700 ${t(15)}px ${MONO}`;
  ctx.fillStyle = GREEN;
  ctx.globalAlpha = 0.65;
  ctx.fillText("PRIMARY STACK", px, cy);
  ctx.fillText("PASS ID", col2X, cy);
  ctx.globalAlpha = 1.0;

  cy += t(34);
  fitText(ctx, displayRole, col1W, 24, 14);
  ctx.fillStyle = INK;
  ctx.fillText(displayRole, px, cy);

  fitText(ctx, pid, col2W, 24, 14);
  ctx.fillStyle = PINK;
  ctx.fillText(pid, col2X, cy);

  // Section 4: Barcode at foot of card
  cy += t(40);
  const bcH = t(44);
  let seed = 0x811c9dc5;
  for (const ch of displayName + displayRole + displayTitle + pid) {
    seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  }
  ctx.fillStyle = INK;
  let bx = px;
  while (bx < px + innerW) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    const barW = 2 + (seed % 7);
    const gap = 3 + ((seed >> 9) % 6);
    ctx.globalAlpha = 0.55 + ((seed >> 17) % 35) / 100;
    ctx.fillRect(bx, cy, Math.min(barW, px + innerW - bx), bcH);
    bx += barW + gap;
  }
  ctx.globalAlpha = 1.0;

  // Footer Tagline (positioned well clear of card and bottom floral artwork)
  const footerY = t(1055);
  tracked(ctx, "HACKER HOUSE GOA · BUILDER PASS 2026", cx, footerY, 18, 4, CREAM);
}

/**
 * Compose front + back onto one shareable sheet, so a single download and a
 * single tweet carry both faces of the pass.
 */
export function composeSheet(front: HTMLCanvasElement, back: HTMLCanvasElement) {
  const pad = 36;
  const gap = 56;
  const out = document.createElement("canvas");
  out.width = pad * 2 + BADGE_W * 2 + gap;
  out.height = pad * 2 + BADGE_H;
  const ctx = out.getContext("2d")!;
  ctx.fillStyle = DEEP;
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(front, pad, pad, BADGE_W, BADGE_H);
  ctx.drawImage(back, pad + BADGE_W + gap, pad, BADGE_W, BADGE_H);
  return out;
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

  const url = URL.createObjectURL(blob);
  try {
    return await loadImage(url);
  } finally {
    // The decoded bitmap stays alive on the HTMLImageElement.
    URL.revokeObjectURL(url);
  }
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read that image"));
    img.src = src;
  });
}
