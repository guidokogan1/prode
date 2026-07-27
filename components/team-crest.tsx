"use client";

import { useState } from "react";

export function TeamCrest({ url, alt, size = 20 }: { url?: string; alt?: string; size?: number }) {
  const [failed, setFailed] = useState(false);

  if (!url || failed) {
    return <span className="crest-empty" style={{ width: size, height: size }} />;
  }

  return (
    <img
      className="crest"
      src={url}
      alt={alt ?? ""}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}
