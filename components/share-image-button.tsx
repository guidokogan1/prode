"use client";

import { Share2 } from "lucide-react";
import { useState, type RefObject } from "react";

type ShareImageButtonProps = {
  targetRef: RefObject<HTMLElement | null>;
  fileName: string;
  shareText?: string;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
};

export function ShareImageButton({
  targetRef,
  fileName,
  shareText = "Mirá cómo va el prode",
  label = "Compartir",
  className = "button-secondary",
  style,
}: ShareImageButtonProps) {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleShare() {
    const node = targetRef.current;
    if (!node || busy) return;

    setBusy(true);
    setFeedback(null);
    try {
      const { toJpeg } = await import("html-to-image");
      const dataUrl = await toJpeg(node, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: "#0a0e14",
        cacheBust: true,
      });

      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], fileName, { type: "image/jpeg" });

      const navigatorWithShare = typeof navigator !== "undefined" ? (navigator as Navigator & { canShare?: (data: ShareData) => boolean }) : null;
      if (navigatorWithShare?.canShare?.({ files: [file] }) && navigatorWithShare.share) {
        try {
          await navigatorWithShare.share({ files: [file], text: shareText });
          setFeedback("Compartido");
          return;
        } catch (error) {
          if ((error as Error).name === "AbortError") {
            return;
          }
        }
      }

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setFeedback("Imagen descargada");
    } catch {
      setFeedback("No se pudo generar la imagen");
    } finally {
      setBusy(false);
      setTimeout(() => setFeedback(null), 3000);
    }
  }

  return (
    <div style={{ display: "grid", gap: 4, ...style }}>
      <button
        type="button"
        className={className}
        onClick={() => void handleShare()}
        disabled={busy}
        style={{ display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "center" }}
      >
        <Share2 size={16} />
        <span>{busy ? "Generando..." : label}</span>
      </button>
      {feedback ? <span className="micro-copy" style={{ textAlign: "center" }}>{feedback}</span> : null}
    </div>
  );
}
