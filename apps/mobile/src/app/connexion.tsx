import { useState } from "react";
import { Alert, KeyboardAvoidingView, Linking, Platform, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { signInSchema, signUpSchema, t } from "@mami/shared";
import { DEMO_MODE, errorMessage, requireSupabase, SITE_URL } from "@/lib/supabase";
import { useColors } from "@/lib/theme";
import { Button, Chip, Input, T } from "@/components/ui";

export default function Login() {
  const c = useColors();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accept, setAccept] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (DEMO_MODE) return Alert.alert(t("Mode démo"), t("Les comptes seront actifs une fois Supabase configuré."));
    setLoading(true);
    try {
      const sb = requireSupabase();
      if (mode === "in") {
        const p = signInSchema.safeParse({ email, password });
        if (!p.success) throw new Error(p.error.issues[0].message);
        const { error } = await sb.auth.signInWithPassword(p.data);
        if (error) throw new Error(/invalid/i.test(error.message) ? t("E-mail ou mot de passe incorrect") : error.message);
        router.back();
      } else {
        const p = signUpSchema.safeParse({ displayName: name, email, password, acceptTerms: accept, marketingConsent: false });
        if (!p.success) throw new Error(p.error.issues[0].message);
        const { error } = await sb.auth.signUp({ email: p.data.email, password: p.data.password, options: { data: { display_name: p.data.displayName, terms_version: "2026-10-29" } } });
        if (error) throw error;
        Alert.alert(t("Vérifiez vos e-mails"), t("Un lien de confirmation a été envoyé à {email}.", { email: p.data.email }));
        setMode("in");
      }
    } catch (e) {
      Alert.alert(t("Erreur"), errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: "row" }}>
          <Chip label={t("Connexion")} active={mode === "in"} onPress={() => setMode("in")} />
          <Chip label={t("Inscription")} active={mode === "up"} onPress={() => setMode("up")} />
        </View>
        {mode === "up" && <Input label={t("Prénom ou pseudo")} value={name} onChangeText={setName} autoComplete="given-name" textContentType="givenName" />}
        <Input label={t("E-mail")} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
        <Input label={t("Mot de passe")} value={password} onChangeText={setPassword} secureTextEntry autoComplete={mode === "in" ? "current-password" : "new-password"} textContentType={mode === "in" ? "password" : "newPassword"} />
        {mode === "up" && (
          <>
            <T size={12} color={c.muted}>{t("10 caractères minimum, avec majuscule, minuscule et chiffre.")}</T>
            <Chip label={`${accept ? "☑" : "☐"} J'accepte les CGU et la politique de confidentialité`} active={accept} onPress={() => setAccept(!accept)} />
            <Button variant="ghost" title={t("Lire les CGU")} onPress={() => Linking.openURL(`${SITE_URL}/legal/cgu`)} />
          </>
        )}
        <Button title={mode === "in" ? t("Se connecter") : t("Créer mon compte")} loading={loading} onPress={submit} />
        {mode === "in" && <Button variant="ghost" title={t("Mot de passe oublié ?")} onPress={() => Linking.openURL(`${SITE_URL}/mot-de-passe-oublie`)} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
