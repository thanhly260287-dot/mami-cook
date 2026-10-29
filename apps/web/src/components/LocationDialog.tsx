import { toast } from "sonner";
import { LocateFixed } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useGeo } from "@/hooks/useGeo";
import { AddressAutocomplete } from "./AddressAutocomplete";

export function LocationDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const geo = useGeo();
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Où êtes-vous ?" description="Nous affichons les cuisines autour de cette adresse.">
      <div className="space-y-4">
        <Button variant="secondary" className="w-full" loading={geo.locating}
          onClick={() => geo.locate().then(() => onOpenChange(false)).catch((e) => toast.error(e.message))}>
          <LocateFixed /> Utiliser ma position actuelle
        </Button>
        <div className="text-center text-xs text-muted-foreground">ou</div>
        <AddressAutocomplete autoFocus onSelect={(a) => { geo.setLocation({ lat: a.lat, lng: a.lng, label: `${a.city}, ${a.postal_code}` }); onOpenChange(false); }} />
      </div>
    </Dialog>
  );
}
