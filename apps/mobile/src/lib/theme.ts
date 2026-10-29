import { useColorScheme } from "react-native";

const light = {
  bg: "#FBFCFE", card: "#FFFFFF", text: "#1D2433", muted: "#5F6B7E", border: "#E3E8EF", input: "#F2F5F9",
  primary: "#2CB5EA", accent: "#9256DE", success: "#1A9E50", warn: "#D97706", danger: "#DC2626", frozen: "#2F7CF6",
};
const dark: typeof light = {
  bg: "#0F1420", card: "#161D2B", text: "#F1F4F9", muted: "#9AA6B8", border: "#253045", input: "#1E2738",
  primary: "#3FBEF0", accent: "#A56EEA", success: "#27B865", warn: "#F59E0B", danger: "#F05252", frozen: "#4C8DF8",
};
export type Colors = typeof light;
export const gradient = ["#3FBEF0", "#9B51E0"] as const;

export function useColors(): Colors {
  return useColorScheme() === "dark" ? dark : light;
}

export const radius = { sm: 10, md: 14, lg: 20, xl: 28 };
