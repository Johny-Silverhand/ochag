import { useEffect, useState } from "react";
import { Share, Plus, Smartphone } from "lucide-react";
import { isAppleDevice, isStandaloneApp } from "@/lib/ios";
import { NETWORK_NAME, LABS_NAME } from "@/lib/brand";
import { Card } from "@/components/ui/card";

export function IosRuntime() {
  useEffect(() => {
    const root = document.documentElement;
    const applyFlags = () => {
      root.classList.toggle("ios-device", isAppleDevice());
      root.classList.toggle("ios-standalone", isStandaloneApp());
      root.classList.toggle("coarse", window.matchMedia("(pointer: coarse)").matches);
    };
    applyFlags();

    const vv = window.visualViewport;
    const syncViewport = () => {
      const height = vv?.height ?? window.innerHeight;
      const offsetTop = vv?.offsetTop ?? 0;
      const keyboard = Math.max(0, window.innerHeight - height - offsetTop);
      root.style.setProperty("--app-height", `${Math.round(height)}px`);
      root.style.setProperty("--kb-offset", `${Math.round(keyboard)}px`);
      root.classList.toggle("keyboard-open", keyboard > 72);
    };
    syncViewport();
    vv?.addEventListener("resize", syncViewport);
    vv?.addEventListener("scroll", syncViewport);
    window.addEventListener("orientationchange", syncViewport);
    window.addEventListener("resize", syncViewport);
    const mode = window.matchMedia("(display-mode: standalone)");
    mode.addEventListener("change", applyFlags);
    return () => {
      vv?.removeEventListener("resize", syncViewport);
      vv?.removeEventListener("scroll", syncViewport);
      window.removeEventListener("orientationchange", syncViewport);
      window.removeEventListener("resize", syncViewport);
      mode.removeEventListener("change", applyFlags);
    };
  }, []);
  return null;
}

export function useIosInstall() {
  const [apple, setApple] = useState(() => isAppleDevice());
  const [standalone, setStandalone] = useState(() => isStandaloneApp());
  useEffect(() => {
    setApple(isAppleDevice());
    setStandalone(isStandaloneApp());
  }, []);
  return { apple, standalone, showGuide: apple && !standalone };
}

export function IosInstallCard({ compact = false, forceGuide = false }: { compact?: boolean; forceGuide?: boolean }) {
  const { showGuide, standalone, apple } = useIosInstall();
  if (!apple && !forceGuide) return null;

  return (
    <div className="space-y-3">
      {standalone ? (
        <Card className="border-success/20 bg-success-soft">
          <div className="flex items-start gap-3">
            <Smartphone className="mt-0.5 size-5 text-success" strokeWidth={1.75} />
            <div>
              <div className="text-sm font-medium text-success">Стоит на экране Домой</div>
              <p className="mt-1 text-sm text-muted">
                {NETWORK_NAME} открывается как приложение: без строки Safari, с вырезом и своей иконкой.
              </p>
            </div>
          </div>
        </Card>
      ) : null}
      {(!standalone || forceGuide) ? (
        <Card>
          <div className="flex items-start gap-3">
            <Smartphone className="mt-0.5 size-5 text-primary" strokeWidth={1.75} />
            <div className="min-w-0">
              <div className="text-sm font-medium">Поставить на iPhone и iPad</div>
              <p className="mt-1 text-sm text-muted">
                {compact
                  ? "Safari → Поделиться → На экран «Домой». Дальше открывайте иконку «Очаг», не вкладку."
                  : "Safari → «Поделиться» → «На экран Домой». Иконка «Очаг» появится рядом с камерой. Дальше открывайте её, не вкладку браузера."}
              </p>
              {compact ? null : (
                <ol className="mt-3 space-y-2 text-sm">
                  <li className="flex gap-2.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-bg font-mono text-[11px] text-muted">
                      1
                    </span>
                    <span>
                      Нажмите{" "}
                      <Share className="mx-0.5 inline size-3.5 align-[-2px] text-primary" strokeWidth={2} /> Поделиться
                      внизу Safari
                    </span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-bg font-mono text-[11px] text-muted">
                      2
                    </span>
                    <span>
                      Пролистайте и выберите{" "}
                      <Plus className="mx-0.5 inline size-3.5 align-[-2px] text-primary" strokeWidth={2} /> На экран
                      «Домой»
                    </span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-bg font-mono text-[11px] text-muted">
                      3
                    </span>
                    <span>Подтвердите имя «Очаг» и откройте иконку с рабочего стола</span>
                  </li>
                </ol>
              )}
              <p className="mt-3 text-[11px] leading-relaxed text-subtle">
                Так ставится приложение на iOS без App Store. Издатель — {LABS_NAME}.
              </p>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
