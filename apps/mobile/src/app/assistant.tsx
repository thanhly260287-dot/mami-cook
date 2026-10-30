// Assistant d'aide IA dans l'appli (discussion écrite) ; il répond dans la langue de la personne.
import { useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { t } from "@mami/shared";
import { callFunction, errorMessage, supabase } from "@/lib/supabase";
import { useColors } from "@/lib/theme";
import { T } from "@/components/ui";
import { FadeInUp } from "@/components/motion";

interface Turn { role: "user" | "assistant"; content: string }

export default function AssistantScreen() {
  const c = useColors();
  const [turns, setTurns] = useState<Turn[]>([{ role: "assistant", content: t("Bonjour ! Je suis l'assistant MAMI COOK. Posez-moi votre question, je vous écoute.") }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const list = useRef<FlatList<Turn>>(null);

  const send = async () => {
    const msg = input.trim();
    if (!msg || busy) return;
    const next: Turn[] = [...turns, { role: "user", content: msg }];
    setTurns(next); setInput(""); setBusy(true);
    try {
      const reply = supabase
        ? (await callFunction<{ reply: string | null }>("assistant", { messages: next.filter((m, i) => i > 0 || m.role === "user").slice(-12), page: "/appli" })).reply
        : t("Aperçu : je réponds ici aux questions fréquentes (annulation, frais, devenir cuisinière, livraison). Une fois le site en ligne, l'assistant IA répondra à toutes vos questions, dans votre langue.");
      setTurns((cur) => [...cur, { role: "assistant", content: reply || t("Je ne peux pas répondre à cette question. Contactez le support depuis Aide → Contact.") }]);
    } catch (e) {
      setTurns((cur) => [...cur, { role: "assistant", content: errorMessage(e) }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <FlatList ref={list} data={turns} keyExtractor={(_, i) => String(i)} contentContainerStyle={{ padding: 16, gap: 10 }}
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
        renderItem={({ item, index }) => (
          <FadeInUp index={0} style={{ alignSelf: item.role === "user" ? "flex-end" : "flex-start", maxWidth: "85%" }}>
            <View key={index} style={{ backgroundColor: item.role === "user" ? c.primary : c.card, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, borderWidth: item.role === "user" ? 0 : 1, borderColor: c.border }}>
              <T size={15} color={item.role === "user" ? "#fff" : c.text} style={{ lineHeight: 21 }}>{item.content}</T>
            </View>
          </FadeInUp>
        )}
        ListFooterComponent={busy ? <T color={c.muted} style={{ marginTop: 8 }}>{t("Je réfléchis…")}</T> : undefined} />
      <View style={{ flexDirection: "row", gap: 8, padding: 12, borderTopWidth: 1, borderColor: c.border, backgroundColor: c.card }}>
        <TextInput value={input} onChangeText={setInput} placeholder={t("Écrivez votre message…")} placeholderTextColor={c.muted} maxLength={2000}
          accessibilityLabel={t("Votre message")} onSubmitEditing={send} returnKeyType="send"
          style={{ flex: 1, borderWidth: 1, borderColor: c.border, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, color: c.text, backgroundColor: c.bg }} />
        <Pressable onPress={send} disabled={!input.trim() || busy} accessibilityRole="button" accessibilityLabel={t("Envoyer")}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.primary, alignItems: "center", justifyContent: "center", opacity: !input.trim() || busy ? 0.4 : 1 }}>
          <Ionicons name="send" size={18} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
