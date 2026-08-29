"use client";

import { useState } from "react";

/**
 * A system "Notifications" row (weather / reminder / package). These have no
 * detail destination and no longer body of text — `KeepInMindItem` only
 * carries `body` — so tapping toggles an inline panel that shows the full,
 * untruncated `body` beneath the row. For a short body that already fits on
 * one line the panel just repeats it; that's expected (see the Today
 * prototype). Todo and review rows navigate instead and stay server-rendered.
 */
export function KeepInMindSystemRow({
  body,
  dotClass = "bg-muted-text",
}: {
  body: string;
  dotClass?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-[9px] py-[5px] text-left"
      >
        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotClass}`} />
        <span className="flex-1 min-w-0 truncate text-[13px] font-medium text-ink">{body}</span>
      </button>
      {open && (
        <div className="ml-[15px] mb-1.5 rounded-lg bg-mist px-2.5 py-2">
          <p className="text-[12px] text-muted-text leading-[1.45]">{body}</p>
        </div>
      )}
    </div>
  );
}
