import { t, intlLocale } from "@mami/shared";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchCookReviews, replyToReview } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { errorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, Spinner, Stars } from "@/components/ui/misc";
import { Textarea } from "@/components/ui/input";

export default function CookReviews() {
  const { cook } = useAuth();
  const q = useQuery({ queryKey: ["cook-reviews", cook!.id], queryFn: () => fetchCookReviews(cook!.id, 100) });
  if (q.isLoading) return <Spinner />;
  if (!q.data?.length) return <EmptyState icon="⭐" title={t("Pas encore d'avis")}>{t("Vos clients pourront vous noter après chaque commande.")}</EmptyState>;
  return (
    <div>
      <p className="mb-4 flex items-center gap-2 text-lg"><Stars value={cook!.rating_avg} size={18} /> <b>{Number(cook!.rating_avg).toFixed(2)}</b> · {cook!.rating_count} avis</p>
      <div className="grid gap-4 md:grid-cols-2">{q.data.map((r) => <ReviewCard key={r.id} review={r} />)}</div>
    </div>
  );
}

function ReviewCard({ review: r }: { review: Awaited<ReturnType<typeof fetchCookReviews>>[number] }) {
  const qc = useQueryClient();
  const [reply, setReply] = useState(r.cook_reply ?? "");
  const [editing, setEditing] = useState(false);
  const save = useMutation({
    mutationFn: () => replyToReview(r.id, reply.trim()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cook-reviews"] }); setEditing(false); toast.success(t("Réponse publiée")); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <Card className="p-5">
      <div className="flex justify-between"><p className="font-semibold">{r.profiles?.display_name}</p><span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString(intlLocale())}</span></div>
      <Stars value={r.rating} />
      {r.comment && <p className="mt-2 text-sm">{r.comment}</p>}
      {r.cook_reply && !editing ? (
        <div className="mt-3 rounded-xl bg-muted p-3 text-sm"><p className="text-xs font-bold">{t("Votre réponse")}</p>{r.cook_reply}<button className="ml-2 text-xs text-primary" onClick={() => setEditing(true)}>{t("Modifier")}</button></div>
      ) : (
        <div className="mt-3">
          <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder={t("Remerciez votre client…")} maxLength={1000} className="min-h-[70px]" />
          <Button size="sm" className="mt-2" disabled={!reply.trim()} loading={save.isPending} onClick={() => save.mutate()}>{t("Répondre")}</Button>
        </div>
      )}
    </Card>
  );
}
