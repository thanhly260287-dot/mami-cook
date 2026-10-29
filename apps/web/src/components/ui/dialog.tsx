import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Dialog({ open, onOpenChange, title, description, children, className, side }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: string; children: ReactNode; className?: string;
  side?: "right" | "bottom";
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <D.Content
          className={cn(
            "fixed z-50 bg-card shadow-xl border border-border overflow-y-auto focus:outline-none",
            side === "right"
              ? "inset-y-0 right-0 w-full max-w-md data-[state=open]:animate-in data-[state=open]:slide-in-from-right"
              : "inset-x-0 bottom-0 max-h-[92vh] rounded-t-3xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-lg sm:rounded-3xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-4",
            className,
          )}
        >
          <div className="sticky top-0 z-10 flex items-start justify-between gap-4 bg-card/95 backdrop-blur px-6 pt-5 pb-3">
            <div>
              <D.Title className="text-lg font-bold">{title}</D.Title>
              {description ? <D.Description className="text-sm text-muted-foreground mt-0.5">{description}</D.Description>
                : <D.Description className="sr-only">{title}</D.Description>}
            </div>
            <D.Close className="rounded-xl p-2 hover:bg-muted" aria-label="Fermer"><X className="h-4 w-4" /></D.Close>
          </div>
          <div className="px-6 pb-6">{children}</div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
