/**
 * Server boot: reconcile records (FS first, then GitHub for freshness) and
 * start the Pulse loop. Runs once per server process, node runtime only.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.PULSE_ENABLED !== "1") return;

  const { loadFromFs, loadFromGitHub, reconcile } = await import("@/lib/records");
  const { runPulse, PULSE_INTERVAL_MS } = await import("@/lib/pulse");

  const boot = async () => {
    try {
      const fs = await loadFromFs(process.cwd());
      const r1 = await reconcile(fs, "fs:boot");
      console.log(`[town] boot reconcile from fs: ${r1.upserted} upserted, ${r1.delisted} delisted`);
      if (r1.invalid.length) console.warn("[town] invalid records:", r1.invalid);

      const repo = process.env.RECORDS_REPO;
      if (repo) {
        const gh = await loadFromGitHub(repo);
        if (gh) {
          const r2 = await reconcile(gh, `github:${repo}@main`);
          console.log(`[town] reconcile from github: ${r2.upserted} upserted, ${r2.delisted} delisted`);
        }
      }
    } catch (e) {
      console.error("[town] boot reconcile failed:", e);
    }

    try {
      const res = await runPulse();
      console.log(`[town] pulse: probed ${res.probed}, ${res.observations} observations`);
    } catch (e) {
      console.error("[town] pulse failed:", e);
    }
  };

  // First run shortly after boot, then on the interval (with GitHub refresh).
  setTimeout(boot, 15_000);
  setInterval(async () => {
    try {
      const repo = process.env.RECORDS_REPO;
      if (repo) {
        const { loadFromGitHub: lg, reconcile: rc } = await import("@/lib/records");
        const gh = await lg(repo);
        if (gh) await rc(gh, `github:${repo}@main`);
      }
      const res = await runPulse();
      console.log(`[town] pulse: probed ${res.probed}, ${res.observations} observations`);
    } catch (e) {
      console.error("[town] pulse tick failed:", e);
    }
  }, PULSE_INTERVAL_MS);
}
