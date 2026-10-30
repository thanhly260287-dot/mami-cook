// Briques d'animation réutilisables (framer-motion). Toutes respectent le réglage système
// « réduire les animations » grâce au <MotionConfig reducedMotion="user"> de Layout.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { animate, motion, useInView, useScroll, useSpring, type Variants } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Apparition en fondu vers le haut quand l'élément entre à l'écran. */
export function Reveal({ children, delay = 0, y = 24, className }: { children: ReactNode; delay?: number; y?: number; className?: string }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.6, delay, ease: EASE }}>
      {children}
    </motion.div>
  );
}

const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } } };
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: EASE } },
};

/** Conteneur dont les enfants <motion.* variants={staggerItem}> apparaissent l'un après l'autre. */
export function Stagger({ children, className, onMount = false }: { children: ReactNode; className?: string; onMount?: boolean }) {
  return onMount ? (
    <motion.div className={className} variants={container} initial="hidden" animate="show">{children}</motion.div>
  ) : (
    <motion.div className={className} variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}>{children}</motion.div>
  );
}

/** Nombre qui défile jusqu'à sa valeur quand il devient visible. */
export function CountUp({ to, format = (n) => Math.round(n).toLocaleString(), duration = 1.6 }: { to: number; format?: (n: number) => string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setValue(to); return; }
    const controls = animate(0, to, { duration, ease: EASE, onUpdate: setValue });
    return () => controls.stop();
  }, [inView, to, duration]);
  return <span ref={ref} className="tabular-nums">{format(value)}</span>;
}

/** Fine barre de progression de lecture en haut de l'écran. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.3 });
  return <motion.div aria-hidden style={{ scaleX }} className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left gradient-primary" />;
}
