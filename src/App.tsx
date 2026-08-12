import { useCallback, useEffect, useRef, useState } from "react";
import artUrl from "./assets/hh-goa-square-frame.png";
import cardTemplateUrl from "./assets/hh-goa-card-template.jpeg";
import guyUrl from "./assets/hh-guy-lean.png";
import revealVideoUrl from "./assets/reveal-video.mp4";
import {
  drawBadge,
  loadImage,
  loadImageFromFile,
  pickBuilderTitle,
  BUILDER_TITLES,
} from "./lib/badge";

/** Time in video when card appears */
const CARD_CUE_MS = 2500;

const CAPTION = (title: string) =>
  `Just minted my Hacker House Goa 2026 builder pass — certified ${title} 🥥\n\nSee you on the beach, builders. #FrameInGoa`;

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardTemplateRef = useRef<HTMLImageElement | null>(null);
  const guyRef = useRef<HTMLImageElement | null>(null);
  const photoRef = useRef<HTMLImageElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [title, setTitle] = useState(BUILDER_TITLES[0]!);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Flow steps: "edit" (live form) | "reveal" (video + hanging card) | "result" (main result page)
  const [viewMode, setViewMode] = useState<"edit" | "reveal" | "result">("edit");
  const [cardImgData, setCardImgData] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [cardTemplate, guy] = await Promise.all([
        loadImage(cardTemplateUrl).catch(() => null),
        loadImage(guyUrl).catch(() => null),
      ]);
      cardTemplateRef.current = cardTemplate;
      guyRef.current = guy;
      try {
        await (document as Document & { fonts?: FontFaceSet }).fonts?.ready;
      } catch {
        /* fonts optional */
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawBadge(canvas, {
      photo: photoRef.current,
      art: cardTemplateRef.current,
      guy: guyRef.current,
      name,
      role,
      title,
    });
  }, [name, role, title]);

  // Real-time canvas updates whenever input fields change
  useEffect(() => {
    if (ready) render();
  }, [ready, hasPhoto, render]);

  useEffect(() => {
    setTitle(pickBuilderTitle(`${name}|${role}`));
  }, [name, role]);

  async function onFile(file?: File | null) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      photoRef.current = await loadImageFromFile(file);
      setHasPhoto(true);
      requestAnimationFrame(() => {
        render();
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "That file could not be read. Try a JPG or PNG.",
      );
    } finally {
      setBusy(false);
    }
  }

  const isFormValid = hasPhoto && name.trim().length > 0 && role.trim().length > 0;

  function generatePass() {
    if (!isFormValid) {
      if (!hasPhoto) setError("Please upload your photo to continue.");
      else if (!name.trim()) setError("Please enter your name.");
      else if (!role.trim()) setError("Please enter your role / stack.");
      return;
    }
    setError(null);
    render();
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL("image/png");
      setCardImgData(dataUrl);
      setViewMode("reveal");
    }
  }

  async function toBlob(): Promise<Blob | null> {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
  }

  async function download() {
    let url = cardImgData;
    if (!url) {
      const blob = await toBlob();
      if (!blob) return;
      url = URL.createObjectURL(blob);
    }
    const a = document.createElement("a");
    a.href = url;
    a.download = `hh-goa-2026-${(name || "builder").toLowerCase().replace(/\s+/g, "-")}.png`;
    a.click();
  }

  async function shareToX() {
    const blob = await toBlob();
    const caption = CAPTION(title);
    const file = blob
      ? new File([blob], "hh-goa-2026-builder-pass.png", { type: "image/png" })
      : null;
    const nav = navigator as Navigator & {
      canShare?: (data: ShareData) => boolean;
    };
    if (file && nav.canShare?.({ files: [file] })) {
      try {
        await nav.share({ files: [file], text: caption });
        return;
      } catch {
        /* fall through */
      }
    }
    await download();
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(caption)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  function resetAll() {
    setName("");
    setRole("");
    setHasPhoto(false);
    photoRef.current = null;
    setCardImgData(null);
    setViewMode("edit");
  }

  return (
    <main className="flex h-dvh min-h-0 flex-col overflow-hidden bg-[color:var(--hh-green)] text-[color:var(--hh-cream)]">
      {/* Background image reverted to full cover */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.14]">
        <img src={artUrl} alt="" className="h-full w-full object-cover" />
      </div>

      {/* Reveal Overlay Mode */}
      {viewMode === "reveal" && cardImgData ? (
        <RevealVideoModal
          cardSrc={cardImgData}
          userName={name}
          onDone={() => setViewMode("result")}
        />
      ) : null}

      <div className="relative mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col gap-3 px-4 py-3 md:gap-4 md:py-5">
        <header className="shrink-0 text-center">
          <span className="inline-block -rotate-2 border-[3px] border-[color:var(--hh-ink)] bg-[color:var(--hh-pink)] px-4 py-1 font-mono text-[11px] font-bold tracking-widest text-[color:var(--hh-cream)] md:text-sm">
            HACKER HOUSE GOA · 2026
          </span>
          <h1 className="mt-2 font-[Archivo_Black] text-3xl leading-[0.95] tracking-tight md:text-5xl">
            MAKE YOUR <span className="text-[color:var(--hh-yellow)]">BUILDER ID</span>
          </h1>
        </header>

        {/* STEP 1: Live Edit Mode */}
        {viewMode === "edit" ? (
          <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,420px)] md:items-stretch md:gap-6">
            {/* Live real-time canvas preview */}
            <div className="order-2 flex min-h-0 flex-1 flex-col items-center justify-center gap-2 md:order-1">
              <div className="relative flex h-full max-h-full aspect-[3/4] w-auto items-center justify-center rounded-3xl border-[4px] border-[color:var(--hh-ink)] bg-[color:var(--hh-deep)] p-1.5 shadow-[10px_10px_0_0_var(--hh-ink)] overflow-hidden">
                <canvas
                  ref={canvasRef}
                  onClick={() => inputRef.current?.click()}
                  className="block h-full w-full object-contain cursor-pointer rounded-2xl"
                  aria-label="Real-time preview of your Builder ID card"
                />
                {!hasPhoto ? (
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="absolute inset-x-0 bottom-4 mx-auto w-[88%] rounded-full border-[3px] border-[color:var(--hh-ink)] bg-[color:var(--hh-yellow)] px-4 py-2.5 font-[Archivo_Black] text-xs md:text-sm text-[color:var(--hh-ink)] shadow-[4px_4px_0_0_var(--hh-ink)] active:translate-y-[1px]"
                  >
                    {busy ? "READING PHOTO…" : "TAP TO UPLOAD YOUR PHOTO *"}
                  </button>
                ) : null}
              </div>
              <p className="shrink-0 text-center font-mono text-xs text-[color:var(--hh-cream)]/70">
                ✨ Live real-time preview — updates instantly as you type and change fields!
              </p>
            </div>

            {/* Step 1 Mandatory Form */}
            <div className="order-1 min-h-0 shrink-0 self-start rounded-3xl border-[4px] border-[color:var(--hh-ink)] bg-[color:var(--hh-cream)] p-5 text-[color:var(--hh-ink)] shadow-[10px_10px_0_0_var(--hh-ink)] md:order-2 md:self-auto md:overflow-y-auto">
              <input
                ref={inputRef}
                type="file"
                accept="image/*,.heic,.heif"
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0])}
              />

              <Field label="1 · Your Photo (Mandatory)">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="w-full rounded-xl border-[3px] border-[color:var(--hh-ink)] bg-white px-4 py-3 text-left font-mono text-sm font-bold shadow-sm transition hover:bg-amber-50"
                >
                  {busy
                    ? "Reading photo…"
                    : hasPhoto
                    ? "✓ Photo Uploaded (Change ↺)"
                    : "📷 Choose Photo *"}
                </button>
              </Field>

              <Field label="2 · Name (Mandatory)">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, 22))}
                  placeholder="Enter your name *"
                  className="w-full rounded-xl border-[3px] border-[color:var(--hh-ink)] bg-white px-4 py-2.5 font-mono text-sm font-bold outline-none focus:border-[color:var(--hh-pink)]"
                />
              </Field>

              <Field label="3 · Role / Stack (Mandatory)">
                <input
                  value={role}
                  onChange={(e) => setRole(e.target.value.slice(0, 28))}
                  placeholder="e.g. Fullstack Dev *"
                  className="w-full rounded-xl border-[3px] border-[color:var(--hh-ink)] bg-white px-4 py-2.5 font-mono text-sm font-bold outline-none focus:border-[color:var(--hh-pink)]"
                />
              </Field>

              <Field label="4 · Builder Title">
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-xl border-[3px] border-[color:var(--hh-ink)] bg-[color:var(--hh-pink)] px-4 py-2.5 font-mono text-[11px] font-bold leading-snug text-[color:var(--hh-cream)]">
                    {title}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setTitle(
                        BUILDER_TITLES[Math.floor(Math.random() * BUILDER_TITLES.length)]!,
                      )
                    }
                    aria-label="Reroll builder title"
                    className="rounded-xl border-[3px] border-[color:var(--hh-ink)] bg-[color:var(--hh-yellow)] px-4 py-2.5 font-mono text-xs font-bold shadow-sm active:translate-y-[1px]"
                  >
                    REROLL 🎲
                  </button>
                </div>
              </Field>

              {error ? (
                <div className="my-2 rounded-xl border-2 border-red-500 bg-red-100 p-2.5 font-mono text-xs font-bold text-red-700">
                  ⚠️ {error}
                </div>
              ) : null}

              {/* Primary Generate Button */}
              <button
                type="button"
                onClick={generatePass}
                disabled={!isFormValid}
                className={`mt-3 w-full rounded-2xl border-[3px] border-[color:var(--hh-ink)] px-5 py-3.5 font-[Archivo_Black] text-base text-[color:var(--hh-ink)] shadow-[4px_4px_0_0_var(--hh-ink)] transition active:translate-y-[2px] ${
                  isFormValid
                    ? "bg-[color:var(--hh-yellow)] hover:bg-amber-300 cursor-pointer"
                    : "bg-gray-300 opacity-60 cursor-not-allowed"
                }`}
              >
                GENERATE BUILDER ID 🚀
              </button>

              {!isFormValid ? (
                <p className="mt-2 text-center font-mono text-[11px] text-[color:var(--hh-ink)]/70">
                  * Fill photo, name, & role to unlock reveal animation
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* STEP 3: Main Result Page (with Hanging Lanyard Card & Action Buttons) */}
        {viewMode === "result" && cardImgData ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-between gap-4 md:flex-row md:items-center md:justify-center md:gap-12">
            {/* Lanyard Hanging Card on Left / Center */}
            <div className="flex flex-1 items-center justify-center">
              <LanyardCard cardSrc={cardImgData} />
            </div>

            {/* Action Panel on Right */}
            <div className="w-full max-w-md shrink-0 rounded-3xl border-[4px] border-[color:var(--hh-ink)] bg-[color:var(--hh-cream)] p-6 text-[color:var(--hh-ink)] shadow-[10px_10px_0_0_var(--hh-ink)]">
              <div className="text-center">
                <span className="inline-block rounded-full bg-[color:var(--hh-pink)] px-3 py-1 font-mono text-xs font-bold text-white">
                  🎉 PASS CREATED SUCCESSFULLY!
                </span>
                <h2 className="mt-3 font-[Archivo_Black] text-2xl text-[color:var(--hh-ink)] md:text-3xl">
                  {name || "BUILDER"} PASS READY
                </h2>
                <p className="mt-1 font-mono text-xs opacity-75">
                  Certified <b className="text-[color:var(--hh-pink)]">{title}</b> for Hacker House Goa 2026!
                </p>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <button
                  onClick={download}
                  className="w-full rounded-2xl border-[3px] border-[color:var(--hh-ink)] bg-[color:var(--hh-yellow)] px-5 py-3.5 font-[Archivo_Black] text-base text-[color:var(--hh-ink)] shadow-[4px_4px_0_0_var(--hh-ink)] transition active:translate-y-[2px]"
                >
                  📥 DOWNLOAD PNG
                </button>

                <button
                  onClick={shareToX}
                  className="w-full rounded-2xl border-[3px] border-[color:var(--hh-ink)] bg-[color:var(--hh-pink)] px-5 py-3.5 font-[Archivo_Black] text-base text-white shadow-[4px_4px_0_0_var(--hh-ink)] transition active:translate-y-[2px]"
                >
                  🚀 SHARE TO X (#FrameInGoa)
                </button>

                <div className="mt-2 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setViewMode("edit")}
                    className="rounded-xl border-[2px] border-[color:var(--hh-ink)] bg-white px-3 py-2 font-mono text-xs font-bold text-[color:var(--hh-ink)] shadow-sm hover:bg-gray-50"
                  >
                    ✏️ EDIT DETAILS
                  </button>
                  <button
                    onClick={resetAll}
                    className="rounded-xl border-[2px] border-[color:var(--hh-ink)] bg-white px-3 py-2 font-mono text-xs font-bold text-[color:var(--hh-ink)] shadow-sm hover:bg-gray-50"
                  >
                    🔄 CREATE NEW
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}

/** Step 2: Reveal Video + Lanyard Ribbon Hanging Card Modal */
function RevealVideoModal({
  cardSrc,
  userName,
  onDone,
}: {
  cardSrc: string;
  userName: string;
  onDone: () => void;
}) {
  const [showHangingCard, setShowHangingCard] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => {
      if (v.currentTime >= CARD_CUE_MS / 1000) setShowHangingCard(true);
    };
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, []);

  const passLabel = `${(userName && userName.trim() ? userName : "BUILDER").toUpperCase()} PASS READY`;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[color:var(--hh-deep)]">
      {/* Video Background */}
      <video
        ref={videoRef}
        src={revealVideoUrl}
        autoPlay
        muted
        playsInline
        onEnded={onDone}
        className="absolute inset-0 z-10 h-full w-full object-cover"
      />

      {/* Generated ID Card hanging on lanyard ribbon on right side */}
      <div
        className="absolute inset-y-0 right-4 z-20 flex items-center justify-center md:right-16"
        style={{
          opacity: showHangingCard ? 1 : 0,
          transform: showHangingCard ? "translateY(0)" : "translateY(60px) scale(0.85)",
          transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <LanyardCard cardSrc={cardSrc} />
      </div>

      {/* Skip Button */}
      <button
        onClick={onDone}
        className="absolute right-6 top-6 z-30 rounded-full border-[3px] border-[color:var(--hh-ink)] bg-[color:var(--hh-yellow)] px-5 py-2.5 font-[Archivo_Black] text-xs font-bold text-[color:var(--hh-ink)] shadow-[4px_4px_0_0_var(--hh-ink)] transition active:translate-y-[1px]"
      >
        CONTINUE TO RESULT ➔
      </button>

      <p className="absolute bottom-6 left-1/2 z-30 -translate-x-1/2 font-mono text-xs tracking-widest text-[color:var(--hh-cream)]/90 bg-black/40 px-4 py-1.5 rounded-full backdrop-blur-sm uppercase">
        🚀 {passLabel} · #FRAMEINGOA
      </p>
    </div>
  );
}

/** Lanyard Strap + Hanging ID Badge Component */
function LanyardCard({
  cardSrc,
  className = "",
}: {
  cardSrc: string;
  className?: string;
}) {
  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      {/* Lanyard Ribbon extending down from top */}
      <div className="h-20 w-9 bg-gradient-to-b from-[color:var(--hh-ink)] via-[color:var(--hh-pink)] to-[color:var(--hh-yellow)] shadow-lg rounded-t-sm flex items-center justify-center border-x-2 border-[color:var(--hh-ink)]">
        <div className="w-1.5 h-full bg-black/30 border-x border-white/20" />
      </div>

      {/* Metallic Clip & Ring */}
      <div className="relative z-20 -mt-2 flex flex-col items-center">
        <div className="w-7 h-7 rounded-full border-[3px] border-[color:var(--hh-ink)] bg-slate-200 shadow-md flex items-center justify-center">
          <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-500 bg-slate-400" />
        </div>
        <div className="w-5 h-3.5 -mt-1 rounded-sm border-2 border-[color:var(--hh-ink)] bg-amber-400 shadow-sm" />
      </div>

      {/* Hanging Badge Card */}
      <div className="relative z-10 -mt-2.5 transition-transform duration-500 hover:rotate-1 hover:scale-[1.01]">
        {/* Top lanyard hole punch cutout illusion */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 w-8 h-2.5 rounded-full border-2 border-[color:var(--hh-ink)] bg-slate-900/60 shadow-inner" />

        <img
          src={cardSrc}
          alt="Generated Hacker House Goa Builder Pass"
          className="h-[58vh] max-h-[560px] w-auto rounded-3xl border-[5px] border-[color:var(--hh-ink)] shadow-[14px_14px_0_0_var(--hh-ink)] object-contain"
        />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest opacity-80">
        {label}
      </span>
      {children}
    </label>
  );
}
