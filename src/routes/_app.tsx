import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell, BootScreen } from "@/components/layout/app-shell";
import { getToken } from "@/lib/api/client";
import { useHydrated, useOps } from "@/lib/data/store";
import { useSync } from "@/lib/data/sync";

export const Route = createFileRoute("/_app")({
  ssr: false,
  pendingComponent: BootScreen,
  component: AppGate,
});

function AppGate() {
  const hydrated = useHydrated();
  const session = useOps((s) => s.session);
  const userCount = useOps((s) => s.users.length);
  const sync = useSync((s) => s.status);
  const navigate = useNavigate();

  useEffect(() => {
    if (!hydrated) return;
    if (session) return;
    if (getToken() && sync === "error") return;
    void navigate({ to: "/" });
  }, [hydrated, session, sync, navigate]);

  if (!hydrated) return <BootScreen />;
  if (!session) return <BootScreen />;
  if (userCount === 0 && sync === "error") return <BootScreen />;
  return <AppShell />;
}
