import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { fetchStoreHealth, type StoreHealth } from "@/lib/api/client";
import { useSync } from "@/lib/data/sync";
import { DB_UNAVAILABLE_MSG } from "@/lib/repo/db-errors";

export function StoreHealthBanner() {
  const sync = useSync();
  const [health, setHealth] = useState<StoreHealth | null>(null);
  const toasted = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void fetchStoreHealth().then((next) => {
      if (cancelled) return;
      setHealth(next);
      if (next.ok && next.store?.ready !== false) return;
      const message = next.error || DB_UNAVAILABLE_MSG;
      useSync.getState().setError(message);
      if (!toasted.current) {
        toasted.current = true;
        toast.error(message);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const down = sync.status === "error" || health?.ok === false || health?.store?.ready === false;
  if (!down) return null;

  return (
    <p role="status" className="mb-4 rounded-2xl bg-danger-soft px-3 py-2.5 text-sm leading-relaxed text-danger">
      {sync.error || health?.error || DB_UNAVAILABLE_MSG}. Вход и «Создать сеть» подождут, пока база оживёт.
    </p>
  );
}
