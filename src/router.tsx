import { createRouter } from "@tanstack/react-router";
import { BootScreen } from "@/components/layout/app-shell";
import { AppErrorComponent } from "@/lib/error-component";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    routeTree,
    defaultErrorComponent: AppErrorComponent,
    defaultPendingComponent: BootScreen,
  });
}
