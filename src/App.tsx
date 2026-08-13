import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import artUrl from "./assets/hh-goa-bg.jpg";
import cardTemplateUrl from "./assets/hh-goa-card-template.jpeg";
import cardBackTemplateUrl from "./assets/hh-goa-card-back-template.png";

import {
  drawBadge,
  drawBadgeBack,
  loadImage,
  loadImageFromFile,
  pickBuilderTitle,
  BUILDER_TITLES,
} from "./lib/badge";

const HASHTAG = "#FrameInGoa";

const caption = (title: string, handle?: string) => {
  const tag = handle ? `@${handle.replace(/^@/, "").trim()} ` : "";
  return `Just minted my Hacker House Goa 2026 builder pass ${tag}— certified ${title} 🥥\n\nSee you on the beach, builders. ${HASHTAG}`;
};

const fileName = (name: string) =>
  `hh-goa-2026-${(name.trim() || "builder").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.png`;

/** Unicode-safe string truncation that never splits multi-byte characters. */
const uSlice = (s: string, max: number) => {
  const chars = [...s];
  return chars.length <= max ? s : chars.slice(0, max).join("");
};

export default function App() {
  const frontRef = useRef<HTMLCanvasElement>(null);
  const backRef = useRef<HTMLCanvasElement>(null);
  const templateRef = useRef<HTMLImageElement | null>(null);
  const backTemplateRef = useRef<HTMLImageElement | null>(null);
  const photoRef = useRef<HTMLImageElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const dragCounter = useRef(0);
  const renderRaf = useRef(0);

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [handle, setHandle] = useState("");
  const [title, setTitle] = useState(BUILDER_TITLES[0]!);
  const [titleTouched, setTitleTouched] = useState(false);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [side, setSide] = useState<"front" | "back">("front");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [template, backTemplate] = await Promise.all([
        loadImage(cardTemplateUrl).catch(() => null),
        loadImage(cardBackTemplateUrl).catch(() => null),
        (document as Document & { fonts?: FontFaceSet }).fonts?.ready.catch(() => null),
      ]);
      if (cancelled) return;
      templateRef.current = template;
      backTemplateRef.current = backTemplate;
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Debounced canvas rendering via rAF to prevent typing lag.
  const badgeInput = useMemo(
    () => ({
      photo: photoRef.current,
      art: templateRef.current,
      name,
      role,
      title,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [name, role, title, ready, hasPhoto],
  );

  useEffect(() => {
    cancelAnimationFrame(renderRaf.current);
    renderRaf.current = requestAnimationFrame(() => {
      const input = {
        ...badgeInput,
        photo: photoRef.current,
        art: templateRef.current,
        backArt: backTemplateRef.current,
      };
      if (frontRef.current) drawBadge(frontRef.current, input);
      if (backRef.current) drawBadgeBack(backRef.current, input);
    });
    return () => cancelAnimationFrame(renderRaf.current);
  }, [badgeInput]);

  useEffect(() => {
    if (!titleTouched) setTitle(pickBuilderTitle(`${name}|${role}`));
  }, [name, role, titleTouched]);

  const showToast = useCallback((msg: string) => {
    clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const onFile = useCallback(async (file?: File | null) => {
    if (!file) return;
    if (!/^image\//.test(file.type) && !/\.(heic|heif)$/i.test(file.name)) {
      setError("That's not an image. Try a JPG, PNG or HEIC.");
      return;
    }
    // Clear the file input so re-selecting the same file triggers onChange.
    if (inputRef.current) inputRef.current.value = "";
    setBusy(true);
    setError(null);
    try {
      photoRef.current = await loadImageFromFile(file);
      setHasPhoto(true);
    } catch {
      setError("That file could not be read. Try a JPG, PNG or HEIC.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      // Don't hijack paste when user is typing in a text input.
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const item = Array.from(e.clipboardData?.items ?? []).find((i) =>
        i.type.startsWith("image/"),
      );
      if (item) onFile(item.getAsFile());
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [onFile]);

  /** PNG of the front builder pass card. */
  const frontCardBlob = useCallback(
    () =>
      new Promise<Blob | null>((resolve) => {
        const front = frontRef.current;
        if (!front) return resolve(null);
        front.toBlob((b) => resolve(b), "image/png");
      }),
    [],
  );

  const download = useCallback(async () => {
    const blob = await frontCardBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName(name);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("Downloaded — builder pass (front)");
  }, [name, frontCardBlob, showToast]);

  /**
   * One-pass Share to X:
   * Opens Twitter/X composer pre-filled with tweet caption & handle immediately.
   */
  const shareToX = useCallback(() => {
    const text = caption(title, handle);
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    const popup = window.open(tweetUrl, "_blank", "noopener,noreferrer");
    if (!popup || popup.closed || typeof popup.closed === "undefined") {
      window.location.href = tweetUrl;
    }
  }, [handle, title]);

  function reset() {
    setName("");
    setRole("");
    setHandle("");
    setTitleTouched(false);
    setHasPhoto(false);
    photoRef.current = null;
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const field =
    "w-full rounded-xl border-2 border-[color:var(--hh-ink)]/15 bg-[color:var(--hh-deep)] px-4 py-3 font-mono text-[15px] font-bold text-[color:var(--hh-cream)] outline-none transition placeholder:text-[color:var(--hh-cream)]/35 focus:border-[color:var(--hh-yellow)] md:text-base";
  const legend =
    "block font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[color:var(--hh-ink)]/55 md:text-xs";
  const action =
    "flex-1 rounded-xl border-[3px] border-[color:var(--hh-ink)] px-4 py-3.5 font-[Archivo_Black] text-[15px] shadow-[3px_3px_0_0_var(--hh-ink)] transition active:translate-y-[2px] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none md:text-base";

  return (
    <main className="flex h-dvh min-h-0 flex-col overflow-y-auto overflow-x-hidden bg-[color:var(--hh-green)] text-[color:var(--hh-cream)] md:overflow-hidden">
      <div className="pointer-events-none fixed inset-0 opacity-[0.14]">
        <img src={artUrl} alt="" className="h-full w-full object-cover" />
      </div>

      <div className="relative mx-auto flex min-h-full w-full max-w-6xl flex-col gap-3 px-3 py-3 md:h-full md:min-h-0 md:gap-4 md:px-4 md:py-4">
        <header className="shrink-0 text-center">
          <span className="inline-block -rotate-2 border-2 border-[color:var(--hh-ink)] bg-[color:var(--hh-pink)] px-3 py-0.5 font-mono text-[10px] font-bold tracking-widest md:text-xs">
            HACKER HOUSE GOA · 2026
          </span>
          <h1 className="mt-1 font-[Archivo_Black] text-2xl leading-none tracking-tight sm:text-3xl md:text-4xl">
            MAKE YOUR <span className="text-[color:var(--hh-yellow)]">BUILDER ID</span>
          </h1>
        </header>

        <div className="flex flex-col gap-4 min-h-0 flex-1 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,500px)] md:grid-rows-1 md:items-stretch md:gap-5">
          {/* ---------- Preview: interactive 3D 180-degree card flip ---------- */}
          <div className="flex min-h-[360px] sm:min-h-[420px] md:min-h-0 flex-col items-center justify-center gap-3">
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  inputRef.current?.click();
                }
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                dragCounter.current += 1;
                setDragging(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
              }}
              onDragLeave={() => {
                dragCounter.current -= 1;
                if (dragCounter.current <= 0) {
                  dragCounter.current = 0;
                  setDragging(false);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                dragCounter.current = 0;
                setDragging(false);
                onFile(e.dataTransfer.files?.[0]);
              }}
              onClick={() => inputRef.current?.click()}
              className={`perspective-1000 relative flex h-full min-h-0 w-full max-w-[340px] sm:max-w-[420px] md:max-w-none flex-1 cursor-pointer items-center justify-center rounded-2xl border-[3px] p-2 shadow-[6px_6px_0_0_var(--hh-ink)] transition md:rounded-3xl md:p-3 md:shadow-[10px_10px_0_0_var(--hh-ink)] ${
                dragging
                  ? "border-[color:var(--hh-yellow)] bg-[color:var(--hh-yellow)]/25"
                  : "border-[color:var(--hh-ink)] bg-[color:var(--hh-deep)]"
              }`}
            >
              {/* 3D Inner Flipper */}
              <div
                className={`transform-style-3d relative h-full w-full max-h-[500px] md:max-h-full flex items-center justify-center transition-transform duration-700 ease-in-out ${
                  side === "back" ? "rotate-y-180" : ""
                }`}
              >
                {/* Front Side */}
                <div className="backface-hidden absolute inset-0 flex items-center justify-center">
                  <canvas
                    ref={frontRef}
                    className="block h-full max-h-[500px] md:max-h-full w-auto max-w-full rounded-xl object-contain md:rounded-2xl"
                    aria-label="Front of your Hacker House Goa builder ID card"
                  />
                </div>

                {/* Back Side */}
                <div className="backface-hidden rotate-y-180 absolute inset-0 flex items-center justify-center">
                  <canvas
                    ref={backRef}
                    className="block h-full max-h-[500px] md:max-h-full w-auto max-w-full rounded-xl object-contain md:rounded-2xl"
                    aria-label="Back of your Hacker House Goa builder ID card"
                  />
                </div>
              </div>

              {busy ? (
                <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-[color:var(--hh-deep)]/70 font-mono text-xs font-bold">
                  Processing photo…
                </div>
              ) : null}
            </div>

            {/* Side Toggle Control */}
            <div className="flex shrink-0 items-center gap-1 rounded-full border-2 border-[color:var(--hh-ink)] bg-[color:var(--hh-deep)] p-1 shadow-md">
              {(["front", "back"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSide(s);
                  }}
                  className={`rounded-full px-5 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest transition-all duration-200 ${
                    side === s
                      ? "bg-[color:var(--hh-yellow)] text-[color:var(--hh-ink)] shadow-sm scale-105"
                      : "text-[color:var(--hh-cream)]/60 hover:text-[color:var(--hh-cream)]"
                  }`}
                >
                  {s === "front" ? "🎴 Front" : "🔄 Back"}
                </button>
              ))}
            </div>
          </div>

          {/* ---------- Form ---------- */}
          <div className="min-h-0 flex flex-col gap-3 md:gap-4 md:overflow-y-auto">
            {/* ---------- Form panel (enlarged) ---------- */}
            <div className="rounded-2xl border-[3px] border-[color:var(--hh-ink)] bg-[color:var(--hh-cream)] p-5 text-[color:var(--hh-ink)] shadow-[6px_6px_0_0_var(--hh-ink)] md:rounded-3xl md:border-[4px] md:p-7 md:shadow-[10px_10px_0_0_var(--hh-ink)]">
              <input
                ref={inputRef}
                type="file"
                accept="image/*,.heic,.heif"
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0])}
              />

              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="w-full rounded-xl border-2 border-dashed border-[color:var(--hh-ink)]/30 bg-[color:var(--hh-deep)] px-5 py-5 text-center transition hover:border-[color:var(--hh-yellow)]"
              >
                <span className="block font-mono text-base font-bold text-[color:var(--hh-cream)] md:text-lg">
                  {busy
                    ? "Processing…"
                    : hasPhoto
                      ? "✓ Photo added — tap to change"
                      : "📷 Upload a photo"}
                </span>
                <span className="mt-1.5 block font-mono text-[11px] text-[color:var(--hh-cream)]/55 md:text-[13px]">
                  JPG · PNG · HEIC · any crop, any orientation
                </span>
              </button>

              <div className="mt-4 sm:mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <label className={legend} htmlFor="hh-name">
                    Name
                  </label>
                  <input
                    id="hh-name"
                    value={name}
                    onChange={(e) => setName(uSlice(e.target.value, 22))}
                    placeholder="Ada Lovelace"
                    autoComplete="name"
                    className={field}
                  />
                </div>
                <div className="space-y-2">
                  <label className={legend} htmlFor="hh-role">
                    Stack / role
                  </label>
                  <input
                    id="hh-role"
                    value={role}
                    onChange={(e) => setRole(uSlice(e.target.value, 28))}
                    placeholder="Full-stack · Rust"
                    className={field}
                  />
                </div>
              </div>

              <div className="mt-4 sm:mt-5 space-y-2">
                <label className={legend} htmlFor="hh-handle">
                  X Username
                </label>
                <input
                  id="hh-handle"
                  value={handle}
                  onChange={(e) => setHandle(uSlice(e.target.value.replace(/\s+/g, ""), 20))}
                  placeholder="@adalovelace"
                  autoComplete="username"
                  className={field}
                />
              </div>

              <div className="mt-4 sm:mt-5 space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <label className={legend} htmlFor="hh-title">
                    Builder title
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setTitleTouched(true);
                      setTitle((prev) => {
                        const pool = BUILDER_TITLES.filter((t) => t !== prev);
                        return pool[Math.floor(Math.random() * pool.length)]!;
                      });
                    }}
                    className="font-mono text-[12px] font-bold uppercase tracking-[0.2em] text-[color:var(--hh-pink)] hover:underline"
                  >
                    🔄 Reroll
                  </button>
                </div>
                <input
                  id="hh-title"
                  value={title}
                  onChange={(e) => {
                    setTitleTouched(true);
                    setTitle(uSlice(e.target.value, 46));
                  }}
                  className={`${field} text-[color:var(--hh-yellow)]`}
                />
              </div>

              {error ? (
                <p
                  role="alert"
                  className="mt-4 rounded-lg border-2 border-red-600 bg-red-50 p-3 font-mono text-[13px] font-bold text-red-700"
                >
                  ⚠️ {error}
                </p>
              ) : null}

              <div className="mt-4 sm:mt-5 flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={download}
                  disabled={!hasPhoto}
                  className={`${action} w-full bg-[color:var(--hh-yellow)] text-[color:var(--hh-ink)]`}
                >
                  📥 DOWNLOAD
                </button>
                <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-[color:var(--hh-ink)]/40 px-1">
                  OR
                </span>
                <button
                  type="button"
                  onClick={shareToX}
                  disabled={!hasPhoto}
                  className={`${action} w-full bg-[color:var(--hh-pink)] text-[color:var(--hh-cream)]`}
                >
                  🚀 SHARE TO X
                </button>
              </div>

              <p className="mt-3 text-center font-mono text-[12px] text-[color:var(--hh-ink)]/60">
                {hasPhoto ? (
                  <>
                    One PNG · front + back ·{" "}
                    <button
                      type="button"
                      onClick={reset}
                      className="underline hover:text-[color:var(--hh-pink)]"
                    >
                      start over
                    </button>
                  </>
                ) : (
                  "Add a photo to unlock download & share"
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {toast ? (
        <div
          role="status"
          className="fixed inset-x-4 bottom-3 z-50 mx-auto max-w-md rounded-xl border-2 border-[color:var(--hh-ink)] bg-[color:var(--hh-cream)] px-3 py-2 text-center font-mono text-[11px] font-bold text-[color:var(--hh-ink)] shadow-[4px_4px_0_0_var(--hh-ink)]"
        >
          {toast}
        </div>
      ) : null}
    </main>
  );
}
