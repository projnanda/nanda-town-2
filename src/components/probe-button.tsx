"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ProbeButton({ slug }: { slug: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  async function probe() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/town/records/${slug}/probe`, { method: "POST" });
      const body = await res.json();
      if (res.ok) {
        setMsg(`recorded ${body.observations} observation${body.observations === 1 ? "" : "s"}`);
        router.refresh();
      } else {
        setMsg(body.error ?? "probe failed");
      }
    } catch {
      setMsg("probe failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={probe}
        disabled={busy}
        className="mono text-[0.7rem] uppercase tracking-[0.14em] rounded-full border border-line px-4 py-2 text-ink hover:border-accent hover:text-accent transition-colors disabled:opacity-50 bg-card"
      >
        {busy ? "probing…" : "probe now"}
      </button>
      {msg && <span className="mono text-[0.68rem] text-muted">{msg}</span>}
    </div>
  );
}
