import * as SwitchPrimitive from "@radix-ui/react-switch";
import type { HTMLAttributes, ReactNode } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function Badge({ className, tone = "muted", ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: "muted" | "primary" | "success" | "warn" | "danger" | "accent" }) {
  const tones = {
    muted: "bg-muted text-muted-foreground",
    primary: "bg-primary/10 text-primary",
    success: "bg-status-hot/10 text-status-hot",
    warn: "bg-status-warn/10 text-status-warn",
    danger: "bg-destructive/10 text-destructive",
    accent: "bg-accent/10 text-accent",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", tones[tone], className)} {...props} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-muted", className)} />;
}

export function Switch({ checked, onCheckedChange, id, disabled }: { checked: boolean; onCheckedChange: (v: boolean) => void; id?: string; disabled?: boolean }) {
  return (
    <SwitchPrimitive.Root id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled}
      className="relative h-6 w-11 shrink-0 rounded-full bg-input transition-colors data-[state=checked]:bg-primary disabled:opacity-50">
      <SwitchPrimitive.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[22px]" />
    </SwitchPrimitive.Root>
  );
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-border bg-card shadow-card", className)} {...props} />;
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      {icon && <div className="mb-4 text-5xl" aria-hidden>{icon}</div>}
      <h3 className="text-lg font-bold">{title}</h3>
      {children && <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{children}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Stars({ value, size = 14, className }: { value: number; size?: number; className?: string }) {
  return (
    <span className={cn("inline-flex", className)} aria-label={`${value} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} style={{ width: size, height: size }} className={i <= Math.round(value) ? "fill-accent text-accent" : "text-muted-foreground/40"} />
      ))}
    </span>
  );
}

export function StarInput({ value, onChange, size = 32 }: { value: number; onChange: (v: number) => void; size?: number }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Note">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" role="radio" aria-checked={value === i} aria-label={`${i} étoile${i > 1 ? "s" : ""}`} onClick={() => onChange(i)} className="p-0.5">
          <Star style={{ width: size, height: size }} className={i <= value ? "fill-accent text-accent" : "text-muted-foreground/40"} />
        </button>
      ))}
    </div>
  );
}

export function QuantityStepper({ value, onChange, min = 1, max }: { value: number; onChange: (v: number) => void; min?: number; max: number }) {
  return (
    <div className="inline-flex items-center rounded-xl border border-border bg-card">
      <button type="button" className="h-10 w-10 text-lg font-bold disabled:opacity-30" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="Retirer un">−</button>
      <span className="w-8 text-center font-bold tabular-nums" aria-live="polite">{value}</span>
      <button type="button" className="h-10 w-10 text-lg font-bold disabled:opacity-30" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Ajouter un">+</button>
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <div className={cn("h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary", className)} role="status" aria-label="Chargement" />;
}
