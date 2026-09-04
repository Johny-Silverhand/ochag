import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";
import { LabsCredit } from "@/components/brand/labs-credit";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/brand";

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-fg">
      <span className="text-danger" aria-hidden="true">
        <TriangleAlert className="size-10" strokeWidth={2} />
      </span>
      <h1 className="text-lg font-semibold">Что-то пошло не так</h1>
      <p className="max-w-md text-sm break-words text-muted">
        {error.message || "Непредвиденная ошибка. Обновите страницу."}
      </p>
      <Button asChild variant="secondary" className="mt-2">
        <Link to="/">На вход</Link>
      </Button>
      <LabsCredit className="absolute inset-x-0 bottom-8" />
    </main>
  );
}

export function AppNotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-fg">
      <div className="text-xs tracking-[0.22em] text-muted uppercase">{APP_NAME}</div>
      <h1 className="text-lg font-semibold">Страница не найдена</h1>
      <p className="max-w-md text-sm text-muted">Такого экрана в контуре нет. Вернитесь на обзор или вход.</p>
      <Button asChild className="mt-2">
        <Link to="/dashboard">На обзор</Link>
      </Button>
      <LabsCredit className="absolute inset-x-0 bottom-8" />
    </main>
  );
}
