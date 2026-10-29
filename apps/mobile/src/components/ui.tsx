import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { gradient, radius, useColors } from "@/lib/theme";

type IconName = keyof typeof Ionicons.glyphMap;

export function Button({ title, onPress, variant = "primary", loading, disabled, icon, style }: {
  title: string; onPress?: () => void; variant?: "primary" | "secondary" | "outline" | "danger" | "ghost"; loading?: boolean; disabled?: boolean; icon?: IconName; style?: ViewStyle;
}) {
  const c = useColors();
  const off = disabled || loading;
  const fg = variant === "primary" || variant === "danger" ? "#fff" : variant === "ghost" ? c.primary : c.text;
  const content = (
    <View style={s.btnInner}>
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
      <Text style={[s.btnText, { color: fg }]}>{title}</Text>
    </View>
  );
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!off }} disabled={off}
      onPress={() => { Haptics.selectionAsync().catch(() => undefined); onPress?.(); }}
      style={({ pressed }) => [{ opacity: off ? 0.5 : pressed ? 0.85 : 1, borderRadius: radius.md, overflow: "hidden" }, style]}>
      {variant === "primary" ? (
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.btn}>{content}</LinearGradient>
      ) : (
        <View style={[s.btn, variant === "secondary" && { backgroundColor: c.input }, variant === "outline" && { borderWidth: 1, borderColor: c.border, backgroundColor: c.card }, variant === "danger" && { backgroundColor: c.danger }]}>{content}</View>
      )}
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const c = useColors();
  return <View style={[{ backgroundColor: c.card, borderColor: c.border, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, padding: 16 }, style]}>{children}</View>;
}

export function T({ children, size = 15, weight = "400", color, style, numberOfLines }: {
  children: ReactNode; size?: number; weight?: "400" | "500" | "600" | "700" | "800"; color?: string; style?: object; numberOfLines?: number;
}) {
  const c = useColors();
  return <Text numberOfLines={numberOfLines} style={[{ fontSize: size, fontWeight: weight, color: color ?? c.text }, style]}>{children}</Text>;
}

export function Input(props: TextInputProps & { label?: string }) {
  const c = useColors();
  return (
    <View style={{ gap: 6 }}>
      {props.label && <T size={13} weight="600">{props.label}</T>}
      <TextInput placeholderTextColor={c.muted} {...props}
        style={[{ backgroundColor: c.input, color: c.text, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 }, props.style]} />
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: !!active }}
      style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, marginRight: 8, backgroundColor: active ? c.primary : c.card, borderWidth: 1, borderColor: active ? c.primary : c.border }}>
      <Text style={{ color: active ? "#fff" : c.text, fontWeight: "600", fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

export function Badge({ label, color }: { label: string; color?: string }) {
  const c = useColors();
  const col = color ?? c.muted;
  return <View style={{ backgroundColor: col + "1F", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 99, alignSelf: "flex-start" }}><Text style={{ color: col, fontSize: 12, fontWeight: "700" }}>{label}</Text></View>;
}

export function Empty({ emoji, title, text, action }: { emoji: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 60, paddingHorizontal: 24, gap: 8 }}>
      <Text style={{ fontSize: 48 }}>{emoji}</Text>
      <T size={18} weight="700" style={{ textAlign: "center" }}>{title}</T>
      {text && <T color="#8893a5" style={{ textAlign: "center" }}>{text}</T>}
      {action && <View style={{ marginTop: 12 }}>{action}</View>}
    </View>
  );
}

export function Stepper({ value, onChange, max }: { value: number; onChange: (v: number) => void; max: number }) {
  const c = useColors();
  const btn = (label: string, v: number, dis: boolean) => (
    <Pressable onPress={() => onChange(v)} disabled={dis} accessibilityLabel={label} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center", opacity: dis ? 0.3 : 1 }}>
      <Ionicons name={label === "moins" ? "remove" : "add"} size={20} color={c.text} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: c.border, borderRadius: 12, backgroundColor: c.card }}>
      {btn("moins", value - 1, value <= 1)}<T weight="700" style={{ width: 24, textAlign: "center" }}>{value}</T>{btn("plus", value + 1, value >= max)}
    </View>
  );
}

export function Loading() {
  const c = useColors();
  return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 40 }}><ActivityIndicator color={c.primary} size="large" /></View>;
}

const s = StyleSheet.create({
  btn: { minHeight: 50, paddingHorizontal: 18, alignItems: "center", justifyContent: "center" },
  btnInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  btnText: { fontSize: 16, fontWeight: "700" },
});
