import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "@/router";
import "./styles.css";

declare global {
  interface Window {
    __VL_DESKTOP__?: boolean;
  }
}

window.__VL_DESKTOP__ = true;

const router = getRouter();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
