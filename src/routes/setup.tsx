import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/setup")({
  ssr: false,
  component: SetupPage,
});

function SetupPage() {
  useEffect(() => {
    window.location.replace("/setup/index.html");
  }, []);
  return <div className="min-h-dvh bg-[#070c0e]" />;
}
