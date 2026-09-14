import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  className,
  children,
  title,
}: {
  className?: string;
  children: ReactNode;
  title: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="sheet-backdrop fixed inset-0 z-50 bg-fg/35 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
      <DialogPrimitive.Content
        className={cn(
          "glass-sheet fixed z-50 max-h-[var(--dialog-max-h)] min-w-0 overflow-x-hidden overflow-y-auto text-fg overscroll-contain opacity-100 focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
          "top-1/2 left-1/2 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl p-5 data-[state=open]:zoom-in-95",
          "max-md:top-auto max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:w-full max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-t-3xl max-md:rounded-b-none max-md:px-[var(--page-pad-x)] max-md:pt-4 max-md:pb-[calc(env(safe-area-inset-bottom)+1.25rem)] max-md:data-[state=open]:slide-in-from-bottom-4",
          className,
        )}
      >
        <div className="sticky top-0 z-10 -mx-5 mb-4 flex items-start justify-between gap-3 bg-inherit px-5 pt-0.5 pb-1 max-md:-mx-[var(--page-pad-x)] max-md:px-[var(--page-pad-x)]">
          <DialogPrimitive.Title className="min-w-0 text-base font-medium tracking-tight text-balance">
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Close className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted transition-colors duration-200 hover:bg-bg hover:text-fg md:size-9">
            <X className="size-5" />
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
