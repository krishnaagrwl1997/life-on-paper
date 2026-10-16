"use client";

import { useEffect, useState } from "react";
import { DownloadSimple, ShareNetwork, X } from "@phosphor-icons/react";
import type { KeptPage } from "@/components/system/memory-interview";
import { track } from "@/lib/analytics";

type Format = "post" | "story";
const SIZES: Record<Format, { width: number; height: number }> = {
  post: { width: 1080, height: 1350 },
  story: { width: 1080, height: 1920 },
};

const PAPER = "#f7f1e7";
const SHEET = "#fcf9f2";
const INK = "#2b2620";
const MUTED = "#7a6e62";
const ACTION = "#c1592b";

function wrap(context: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (context.measureText(next).width > width && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    lines.push(line);
  }
  return lines;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

/** Draws one page of the book as a shareable image, in the book's own typefaces. */
async function drawCard(page: KeptPage, bookTitle: string, format: Format) {
  const { width, height } = SIZES[format];
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("no canvas");
  await Promise.all([
    document.fonts.load('600 80px "Fraunces"'),
    document.fonts.load('400 40px "Fraunces"'),
    document.fonts.load('italic 400 40px "Fraunces"'),
    document.fonts.load('600 26px "Inter"'),
  ]).catch(() => undefined);

  context.fillStyle = PAPER;
  context.fillRect(0, 0, width, height);

  const margin = 72;
  const sheetX = margin;
  const sheetY = format === "story" ? 200 : margin;
  const sheetW = width - margin * 2;
  const sheetH = height - sheetY - (format === "story" ? 260 : 150);
  context.save();
  context.shadowColor = "rgba(63, 48, 32, 0.16)";
  context.shadowBlur = 50;
  context.shadowOffsetY = 18;
  context.fillStyle = SHEET;
  context.beginPath();
  context.roundRect(sheetX, sheetY, sheetW, sheetH, 18);
  context.fill();
  context.restore();

  const inner = 84;
  const textX = sheetX + inner;
  const textW = sheetW - inner * 2;
  let y = sheetY + inner;

  context.fillStyle = MUTED;
  context.font = '600 24px "Inter", sans-serif';
  context.letterSpacing = "4px";
  context.fillText(bookTitle.toUpperCase().slice(0, 48), textX, y);
  y += 64;

  if (page.photo) {
    try {
      const image = await loadImage(page.photo);
      const boxH = format === "story" ? 560 : 420;
      const scale = Math.max(textW / image.width, boxH / image.height);
      const sw = textW / scale;
      const sh = boxH / scale;
      context.save();
      context.beginPath();
      context.roundRect(textX, y, textW, boxH, 14);
      context.clip();
      context.drawImage(image, (image.width - sw) / 2, (image.height - sh) / 2, sw, sh, textX, y, textW, boxH);
      context.restore();
      y += boxH + 56;
    } catch {
      // A page without its photo is still a page.
    }
  }

  context.fillStyle = ACTION;
  context.font = '600 24px "Inter", sans-serif';
  context.fillText((page.date || "").toUpperCase(), textX, y);
  y += 30;

  context.letterSpacing = "0px";
  context.fillStyle = INK;
  const titleSize = page.title.length > 40 ? 64 : 78;
  context.font = `600 ${titleSize}px "Fraunces", serif`;
  for (const line of wrap(context, page.title, textW).slice(0, 3)) {
    y += titleSize * 1.1;
    context.fillText(line, textX, y);
  }
  y += 48;

  // The largest size at which the whole page fits; if none does, the
  // smallest size and an ellipsis.
  const bottom = sheetY + sheetH - inner - 20;
  const paragraphs = page.body.filter(Boolean);
  let size = 34;
  for (const candidate of [50, 46, 42, 38, 34]) {
    context.font = `400 ${candidate}px "Fraunces", serif`;
    const height = paragraphs.reduce((total, paragraph) => total + wrap(context, paragraph, textW).length * candidate * 1.5 + candidate * 0.6, 0);
    size = candidate;
    if (y + height <= bottom) break;
  }
  context.font = `400 ${size}px "Fraunces", serif`;
  const lineHeight = size * 1.5;
  let clipped = false;
  for (const paragraph of paragraphs) {
    for (const line of wrap(context, paragraph, textW)) {
      if (y + lineHeight > bottom) {
        clipped = true;
        break;
      }
      y += lineHeight;
      context.fillText(line, textX, y);
    }
    if (clipped) break;
    y += size * 0.6;
  }
  if (clipped) {
    context.fillStyle = MUTED;
    context.fillText("…", textX, Math.min(y + lineHeight, bottom + lineHeight * 0.5));
  }

  // Footer: the quiet invitation.
  const footY = sheetY + sheetH + (format === "story" ? 110 : 82);
  context.textAlign = "center";
  context.fillStyle = INK;
  context.font = '600 34px "Fraunces", serif';
  context.fillText("Life on Paper", width / 2, footY);
  context.fillStyle = MUTED;
  context.font = '500 24px "Inter", sans-serif';
  context.fillText("A few lines a day. A book of your life. · lifeonpaper.app", width / 2, footY + 44);

  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("no image"))), "image/png"));
}

export function ShareCardSheet({ page, bookTitle, onClose }: { page: KeptPage; bookTitle: string; onClose: () => void }) {
  const [format, setFormat] = useState<Format>("post");
  const [image, setImage] = useState<{ blob: Blob; url: string } | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let made: string | null = null;
    void drawCard(page, bookTitle, format).then((blob) => {
      if (cancelled) return;
      made = URL.createObjectURL(blob);
      setImage({ blob, url: made });
    }).catch(() => setNote("Couldn't draw this page. Try again in a moment."));
    return () => {
      cancelled = true;
      if (made) URL.revokeObjectURL(made);
    };
  }, [page, bookTitle, format]);

  const fileName = `${page.title.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").toLowerCase() || "page"}.png`;

  const share = async () => {
    if (!image) return;
    const file = new File([image.blob], fileName, { type: "image/png" });
    const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
    if (nav.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: page.title, text: "A page from my book — lifeonpaper.app" });
        track("share_card", { format, method: "share" });
        return;
      } catch (error) {
        if ((error as DOMException)?.name === "AbortError") return;
      }
    }
    download();
  };

  const download = () => {
    if (!image) return;
    const link = document.createElement("a");
    link.href = image.url;
    link.download = fileName;
    link.click();
    track("share_card", { format, method: "download" });
    setNote("Saved. Post it anywhere — only what you see in the picture is shared.");
  };

  return (
    <div className="share-sheet" role="dialog" aria-modal="true" aria-label="Share this page as a picture">
      <button type="button" className="share-sheet__scrim" aria-label="Close" onClick={onClose} />
      <div className="share-sheet__panel">
        <header>
          <div><span>Share as a picture</span><strong>{page.title}</strong></div>
          <button type="button" aria-label="Close" onClick={onClose}><X size={18} weight="bold" aria-hidden="true" /></button>
        </header>
        <div className="share-sheet__formats" role="group" aria-label="Picture shape">
          <button type="button" aria-pressed={format === "post"} onClick={() => setFormat("post")}>Post</button>
          <button type="button" aria-pressed={format === "story"} onClick={() => setFormat("story")}>Story</button>
        </div>
        <div className={`share-sheet__preview share-sheet__preview--${format}`}>
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image.url} alt={`Preview of "${page.title}" as a picture`} />
          ) : (
            <span>Drawing your page…</span>
          )}
        </div>
        <p className="share-sheet__privacy">Only this page is shared — never the rest of your book.</p>
        {note ? <p className="share-sheet__note" role="status">{note}</p> : null}
        <footer>
          <button type="button" onClick={download} disabled={!image}><DownloadSimple size={17} aria-hidden="true" /> Save picture</button>
          <button type="button" className="share-sheet__share" onClick={share} disabled={!image}><ShareNetwork size={17} weight="bold" aria-hidden="true" /> Share</button>
        </footer>
      </div>
    </div>
  );
}
