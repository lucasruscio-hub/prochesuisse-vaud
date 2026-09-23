"use client";

import Image from "next/image";
import { useState } from "react";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#10213D]";

function GoogleAuthorAvatar({ src }) {
  const [status, setStatus] = useState("loading");
  if (!src || status === "failed") return null;

  return <Image src={src} alt="" width={28} height={28} unoptimized
    aria-hidden="true"
    onLoad={() => setStatus("loaded")}
    onError={() => setStatus("failed")}
    className={`rounded-full ${status === "loaded" ? "visible" : "invisible"}`} />;
}

export default function GoogleReviewCard({ review }) {
  const [expanded, setExpanded] = useState(false);

  return <blockquote className="flex min-h-64 flex-col rounded-xl border border-[#EEE4DF] bg-[#FFFAF7] p-5">
    <p className={`text-[#354359] ${review.expandable && !expanded ? "line-clamp-5" : ""}`}>“{review.quote}”</p>
    {review.expandable && <button type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)} className={`mt-2 self-start text-sm font-semibold text-[#9D3043] underline decoration-[#E7A6AF] underline-offset-4 ${focus}`}>
      {expanded ? "Réduire" : "Lire la suite"}
    </button>}
    <footer className="mt-auto pt-5 text-sm text-[#10213D]" translate="no">
      <span className="flex items-center gap-2">
        <GoogleAuthorAvatar src={review.author.photoUri} />
        {review.author.uri ? <a href={review.author.uri} target="_blank" rel="noopener noreferrer" className={`font-semibold underline underline-offset-2 ${focus}`}>{review.author.name}</a> : <strong>{review.author.name}</strong>}
      </span>
      <span className="mt-2 block text-xs text-[#5D6979]">{review.rating != null && `${review.rating}/5`}{review.rating != null && review.relativeDate && " · "}{review.relativeDate}{review.visitDate && ` · Visite ${review.visitDate}`}{review.translated && " · Traduit par Google"}</span>
      <a href={review.sourceUrl} target="_blank" rel="noopener noreferrer" className={`mt-2 inline-block text-xs underline underline-offset-2 ${focus}`}>Lire sur Google Maps</a>
    </footer>
  </blockquote>;
}
