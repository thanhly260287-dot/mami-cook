import { useEffect, useId, useState } from "react";
import { MapPin } from "lucide-react";
import { searchAddress } from "@/lib/api";
import { Input } from "@/components/ui/input";

export type AddressSuggestion = Awaited<ReturnType<typeof searchAddress>>[number];

/** Champ d'adresse avec suggestions (Base Adresse Nationale). */
export function AddressAutocomplete({ onSelect, placeholder = "Ex : 10 rue de Rivoli, Paris", autoFocus }: {
  onSelect: (a: AddressSuggestion) => void; placeholder?: string; autoFocus?: boolean;
}) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const id = useId();

  useEffect(() => {
    const timer = setTimeout(() => {
      searchAddress(q).then((r) => { setItems(r); setOpen(r.length > 0); }).catch(() => setItems([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);

  return (
    <div className="relative">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} autoFocus={autoFocus} autoComplete="street-address"
        role="combobox" aria-expanded={open} aria-controls={id} onBlur={() => setTimeout(() => setOpen(false), 150)} onFocus={() => setOpen(items.length > 0)} />
      {open && (
        <ul id={id} role="listbox" className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-border bg-popover shadow-xl">
          {items.map((a) => (
            <li key={a.label} role="option" aria-selected={false}>
              <button type="button" className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted"
                onMouseDown={(e) => e.preventDefault()} onClick={() => { onSelect(a); setQ(a.label); setOpen(false); }}>
                <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />{a.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
