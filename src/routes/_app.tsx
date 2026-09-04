import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell, BootScreen } from "@/components/layout/app-shell";
import { useHydrated, useOps } from "@/lib/data/store";

export const Route = createFileRoute("/_app")({
  ssr: false,
  component: AppGate,
});

function AppGate() {
  const hydrated = useHydrated();
  const session = useOps((s) => s.session);
  const navigate = useNavigate();

  useEffect(() => {
    if (hydrated && !session) void navigate({ to: "/" });
  }, [hydrated, session, navigate]);

  if (!hydrated || !session) return <BootScreen />;
  return <AppShell />;
}
