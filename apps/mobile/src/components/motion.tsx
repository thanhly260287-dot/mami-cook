// Animations de l'appli (API Animated de React Native, sans dépendance en plus).
// Coupées automatiquement si le téléphone a l'option « réduire les animations ».
import { useEffect, useState, type ReactNode } from "react";
import { AccessibilityInfo, Animated, Easing, type ViewStyle } from "react-native";

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => sub.remove();
  }, []);
  return reduced;
}

/** Apparition en fondu vers le haut, avec un léger décalage selon la position dans la liste. */
export function FadeInUp({ children, index = 0, style }: { children: ReactNode; index?: number; style?: ViewStyle }) {
  const reduced = useReducedMotion();
  const v = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    if (reduced) { v.setValue(1); return; }
    Animated.timing(v, { toValue: 1, duration: 450, delay: Math.min(index, 6) * 70, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [v, index, reduced]);
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

/** Échelle qui s'enfonce légèrement à l'appui (à brancher sur onPressIn / onPressOut). */
export function usePressScale(to = 0.97) {
  const scale = useState(() => new Animated.Value(1))[0];
  const spring = (v: number) => Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  return { scale, onPressIn: () => spring(to), onPressOut: () => spring(1) };
}

/** Petit rebond en boucle (emoji des pages vides). */
export function Bounce({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const v = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [v, reduced]);
  return <Animated.View style={{ transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }] }}>{children}</Animated.View>;
}
