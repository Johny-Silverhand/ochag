import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { ThemeProvider, THEME_BOOT_SCRIPT } from "@/components/theme/provider";
import { IosRuntime } from "@/components/ios/runtime";
import { Toaster } from "sonner";
import appCss from "../styles.css?url";
import { APP_NAME, NETWORK_NAME } from "@/lib/brand";
import { AppErrorComponent, AppNotFound } from "@/lib/error-component";
import { usePrefs } from "@/lib/prefs";
import { themeMeta } from "@/lib/theme";
import { APPLE_SPLASH } from "@/lib/ios";

export const Route = createRootRoute({
  errorComponent: AppErrorComponent,
  notFoundComponent: AppNotFound,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1",
      },
      { title: APP_NAME },
      { name: "theme-color", content: "#17352b" },
      { name: "description", content: "Операционный контур общепита: товароучёт, смены, банкеты и прибыль." },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: NETWORK_NAME },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "format-detection", content: "telephone=no" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap",
      },
      ...APPLE_SPLASH.map((item) => ({
        rel: "apple-touch-startup-image",
        href: item.href,
        media: item.media,
      })),
    ],
  }),
  component: RootDocument,
});

declare global {
  interface Window {
    __VL_DESKTOP__?: boolean;
  }
}

function RootDocument() {
  const theme = usePrefs((s) => s.theme);
  const density = usePrefs((s) => s.density);
  const motion = usePrefs((s) => s.motion);
  const typeScale = usePrefs((s) => s.typeScale);
  const scheme = themeMeta(theme).scheme;

  const shell = (
    <>
      <PreviewHostBridge />
      <IosRuntime />
      <AuthProvider>
        <ThemeProvider>
          <Outlet />
          <Toaster
            theme={scheme}
            position="top-center"
            offset="calc(env(safe-area-inset-top) + 12px)"
            toastOptions={{
              className: "font-sans text-sm",
            }}
          />
        </ThemeProvider>
      </AuthProvider>
    </>
  );

  if (typeof window !== "undefined" && window.__VL_DESKTOP__) {
    return shell;
  }

  return (
    <html
      lang="ru"
      className={scheme === "dark" ? "dark antialiased" : "antialiased"}
      data-theme={theme}
      data-density={density}
      data-motion={motion}
      data-type={typeScale}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="min-h-dvh bg-bg text-fg antialiased" suppressHydrationWarning>
        {shell}
        <Scripts />
      </body>
    </html>
  );
}
