// Assistant d'aide IA : discussion écrite et « mode appel » (on parle, il répond à voix haute).
// Reconnaissance et synthèse vocales du navigateur (aucune donnée audio envoyée à nos serveurs :
// seul le texte reconnu part vers l'assistant). Réponse dans la langue de la personne.
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Mic, MicOff, Phone, PhoneOff, Send, X } from "lucide-react";
import { intlLocale, t } from "@mami/shared";
import { askAssistant, type AssistantTurn } from "@/lib/api";
import { cn, errorMessage } from "@/lib/utils";

// API vocale du navigateur (Chrome, Edge, Safari) : types minimaux
interface Recognition { lang: string; interimResults: boolean; continuous: boolean; start(): void; stop(): void; abort(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null }
const RecognitionCtor = (typeof window !== "undefined"
  ? (window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }).SpeechRecognition
    ?? (window as unknown as { webkitSpeechRecognition?: new () => Recognition }).webkitSpeechRecognition
  : undefined);
const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;

type CallState = "off" | "listening" | "thinking" | "speaking";

export function Assistant() {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<AssistantTurn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [call, setCall] = useState<CallState>("off");
  const [dictating, setDictating] = useState(false);
  const recRef = useRef<Recognition | null>(null);
  const callRef = useRef<CallState>("off");
  const listRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  callRef.current = call;

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }); }, [turns, busy]);
  useEffect(() => () => { recRef.current?.abort(); if (canSpeak) window.speechSynthesis.cancel(); }, []);

  const speak = (text: string, onDone: () => void) => {
    if (!canSpeak) return onDone();
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = intlLocale();
    u.rate = 1.02;
    u.onend = onDone;
    u.onerror = onDone;
    window.speechSynthesis.speak(u);
  };

  const send = async (text: string) => {
    const msg = text.trim();
    if (!msg || busy) return;
    setError(null);
    const next: AssistantTurn[] = [...turns, { role: "user", content: msg }];
    setTurns(next);
    setInput("");
    setBusy(true);
    if (callRef.current !== "off") setCall("thinking");
    try {
      const reply = await askAssistant(next, pathname);
      setTurns((cur) => [...cur, { role: "assistant", content: reply }]);
      if (callRef.current !== "off") {
        setCall("speaking");
        speak(reply, () => { if (callRef.current !== "off") listen(true); });
      }
    } catch (e) {
      setError(errorMessage(e));
      if (callRef.current !== "off") setCall("off");
    } finally {
      setBusy(false);
    }
  };

  // Écoute une phrase ; en mode appel, l'envoie dès qu'elle est terminée.
  const listen = (inCall: boolean) => {
    if (!RecognitionCtor) { setError(t("La reconnaissance vocale n'est pas disponible sur ce navigateur. Essayez Chrome ou Safari.")); return; }
    recRef.current?.abort();
    const rec = new RecognitionCtor();
    rec.lang = intlLocale();
    rec.interimResults = !inCall;
    rec.continuous = false;
    let finalText = "";
    rec.onresult = (e) => {
      const r = e.results[e.results.length - 1];
      if (inCall) { if (r.isFinal) finalText = r[0].transcript; }
      else setInput(Array.from(e.results).map((x) => x[0].transcript).join(" "));
    };
    rec.onerror = (e) => { if (e.error === "not-allowed") setError(t("Autorisez l'accès au micro pour parler à l'assistant.")); };
    rec.onend = () => {
      setDictating(false);
      if (!inCall || callRef.current === "off") return;
      if (finalText.trim()) void send(finalText);
      else if (callRef.current === "listening") listen(true); // silence : on réécoute
    };
    recRef.current = rec;
    if (inCall) setCall("listening"); else setDictating(true);
    rec.start();
  };

  const startCall = () => {
    setError(null);
    const hello = t("Bonjour ! Je suis l'assistant MAMI COOK. Posez-moi votre question, je vous écoute.");
    setTurns((cur) => (cur.length ? cur : [{ role: "assistant", content: hello }]));
    setCall("speaking");
    callRef.current = "speaking";
    speak(hello, () => { if (callRef.current !== "off") listen(true); });
  };
  const hangUp = () => {
    setCall("off");
    callRef.current = "off";
    recRef.current?.abort();
    if (canSpeak) window.speechSynthesis.cancel();
  };

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button key="fab" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
            onClick={() => setOpen(true)} aria-label={t("Ouvrir l'assistant")}
            className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full gradient-primary text-white shadow-xl md:bottom-6 md:right-6">
            <Bot className="h-6 w-6" />
            <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 animate-ping rounded-full bg-emerald-400" aria-hidden />
            <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400" aria-hidden />
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {open && (
          <motion.section key="panel" role="dialog" aria-label={t("Assistant MAMI COOK")}
            initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.96 }} transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="fixed inset-x-3 bottom-20 z-50 flex max-h-[75vh] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl md:inset-x-auto md:bottom-6 md:right-6 md:w-[400px]">
            <header className="flex items-center gap-3 gradient-primary px-4 py-3 text-white">
              <Bot className="h-6 w-6 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-bold leading-tight">{t("Assistant MAMI COOK")}</p>
                <p className="text-xs opacity-90">{t("Répond dans votre langue, 24 h/24")}</p>
              </div>
              {call === "off" ? (
                <button onClick={startCall} aria-label={t("Appeler l'assistant")} className="rounded-full bg-white/20 p-2 hover:bg-white/30"><Phone className="h-5 w-5" /></button>
              ) : (
                <button onClick={hangUp} aria-label={t("Raccrocher")} className="rounded-full bg-red-500 p-2 hover:bg-red-600"><PhoneOff className="h-5 w-5" /></button>
              )}
              <button onClick={() => { hangUp(); setOpen(false); }} aria-label={t("Fermer")} className="rounded-full p-2 hover:bg-white/20"><X className="h-5 w-5" /></button>
            </header>

            {call !== "off" && (
              <div className="flex flex-col items-center gap-3 border-b border-border bg-primary/5 py-6" aria-live="polite">
                <div className="relative flex h-24 w-24 items-center justify-center">
                  {call !== "thinking" && <span className="absolute inset-0 animate-ping rounded-full bg-primary/25" />}
                  <span className={cn("relative flex h-20 w-20 items-center justify-center rounded-full text-white shadow-primary gradient-primary", call === "thinking" && "animate-pulse")}>
                    {call === "listening" ? <Mic className="h-8 w-8" /> : <Bot className="h-8 w-8" />}
                  </span>
                </div>
                <p className="text-sm font-semibold">{call === "listening" ? t("Je vous écoute…") : call === "thinking" ? t("Je réfléchis…") : t("Je vous réponds…")}</p>
              </div>
            )}

            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
              {turns.length === 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{t("Bonjour ! Posez votre question par écrit, au micro, ou appelez-moi avec le bouton téléphone.")}</p>
                  {[t("Comment annuler une commande ?"), t("Comment devenir cuisinière ?"), t("Quels sont les frais ?")].map((q) => (
                    <button key={q} onClick={() => send(q)} className="mr-2 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted">{q}</button>
                  ))}
                </div>
              )}
              {turns.map((m, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className={cn("max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed", m.role === "user" ? "ml-auto gradient-primary text-white" : "bg-muted")}>
                  {m.content}
                </motion.div>
              ))}
              {busy && <div className="flex w-16 gap-1 rounded-2xl bg-muted px-3.5 py-3">{[0, 1, 2].map((d) => <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: `${d * 0.15}s` }} />)}</div>}
              {error && <p className="rounded-xl bg-destructive/10 p-2.5 text-sm text-destructive">{error}</p>}
            </div>

            <form onSubmit={(e) => { e.preventDefault(); void send(input); }} className="flex items-center gap-2 border-t border-border p-3">
              {RecognitionCtor && call === "off" && (
                <button type="button" onClick={() => (dictating ? recRef.current?.stop() : listen(false))} aria-label={dictating ? t("Arrêter le micro") : t("Parler au micro")}
                  className={cn("shrink-0 rounded-full p-2.5", dictating ? "animate-pulse bg-red-500 text-white" : "bg-muted hover:bg-muted/70")}>
                  {dictating ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>
              )}
              <input value={input} onChange={(e) => setInput(e.target.value)} maxLength={2000} placeholder={t("Écrivez votre message…")} aria-label={t("Votre message")}
                className="min-w-0 flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary" />
              <button type="submit" disabled={!input.trim() || busy} aria-label={t("Envoyer")} className="shrink-0 rounded-full gradient-primary p-2.5 text-white disabled:opacity-40"><Send className="h-5 w-5" /></button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}
