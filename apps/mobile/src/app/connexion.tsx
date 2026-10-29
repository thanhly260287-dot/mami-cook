import { useState } from "react";
import { Alert, KeyboardAvoidingView, Linking, Platform, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { signInSchema, signUpSchema } from "@mami/shared";
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
    if (DEMO_MODE) return Alert.alert("Mode démo", "Les comptes seront actifs une fois Supabase configuré.");
    setLoading(true);
    try {
      const sb = requireSupabase();
      if (mode === "in") {
        const p = signInSchema.safeParse({ email, password });
        if (!p.success) throw new Error(p.error.issues[0].message);
        const { error } = await sb.auth.signInWithPassword(p.data);
        if (error) throw new Error(/invalid/i.test(error.message) ? "E-mail ou mot de passe incorrect" : error.message);
        router.back();
      } else {
        const p = signUpSchema.safeParse({ displayName: name, email, password, acceptTerms: accept, marketingConsent: false });
        if (!p.success) throw new Error(p.error.issues[0].message);
        const { error } = await sb.auth.signUp({ email: p.data.email, password: p.data.password, options: { data: { display_name: p.data.displayName, terms_version: "2026-10-29" } } });
        if (error) throw error;
        Alert.alert("Vérifiez vos e-mails", `Un lien de confirmation a été envoyé à ${p.data.email}.`);
        setMode("in");
      }
    } catch (e) {
      Alert.alert("Erreur", errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: "row" }}>
          <Chip label="Connexion" active={mode === "in"} onPress={() => setMode("in")} />
          <Chip label="Inscription" active={mode === "up"} onPress={() => setMode("up")} />
        </View>
        {mode === "up" && <Input label="Prénom ou pseudo" value={name} onChangeText={setName} autoComplete="given-name" textContentType="givenName" />}
        <Input label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
        <Input label="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry autoComplete={mode === "in" ? "current-password" : "new-password"} textContentType={mode === "in" ? "password" : "newPassword"} />
        {mode === "up" && (
          <>
            <T size={12} color={c.muted}>10 caractères minimum, avec majuscule, minuscule et chiffre.</T>
            <Chip label={`${accept ? "☑" : "☐"} J'accepte les CGU et la politique de confidentialité`} active={accept} onPress={() => setAccept(!accept)} />
            <Button variant="ghost" title="Lire les CGU" onPress={() => Linking.openURL(`${SITE_URL}/legal/cgu`)} />
          </>
        )}
        <Button title={mode === "in" ? "Se connecter" : "Créer mon compte"} loading={loading} onPress={submit} />
        {mode === "in" && <Button variant="ghost" title="Mot de passe oublié ?" onPress={() => Linking.openURL(`${SITE_URL}/mot-de-passe-oublie`)} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
