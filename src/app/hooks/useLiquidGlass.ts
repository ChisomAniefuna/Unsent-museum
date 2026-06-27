import { DependencyList, RefObject, useEffect } from "react";

type LiquidGlassInstance = {
  destroy: () => void;
};

type LiquidGlassOptions = {
  root: HTMLElement;
  glassElements: HTMLElement[];
  defaults?: Record<string, unknown>;
};

const DEFAULTS = {
  blurAmount: 0.06,
  refraction: 0.26,
  chromAberration: 0.012,
  edgeHighlight: 0.05,
  specular: 0.03,
  fresnel: 0.62,
  distortion: 0.008,
  cornerRadius: 24,
  zRadius: 18,
  opacity: 0.48,
  saturation: 0.02,
  tintStrength: 0,
  brightness: 0.02,
  shadowOpacity: 0.12,
  shadowSpread: 8,
  shadowOffsetY: 1,
  button: true,
};

function afterIdle(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  if ("requestIdleCallback" in window) {
    const id = window.requestIdleCallback(callback, { timeout: 1400 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(callback, 500);
  return () => window.clearTimeout(id);
}

export function useLiquidGlass(
  rootRef: RefObject<HTMLElement>,
  deps: DependencyList = [],
) {
  useEffect(() => {
    let cancelled = false;
    let instance: LiquidGlassInstance | null = null;

    const cancelIdle = afterIdle(() => {
      const root = rootRef.current;
      if (!root) return;

      const glassElements = Array.from(root.children).filter(
        (child): child is HTMLElement =>
          child instanceof HTMLElement && child.classList.contains("glass"),
      );
      if (!glassElements.length) return;

      import("@ybouane/liquidglass")
        .then(({ LiquidGlass }: { LiquidGlass: { init: (options: LiquidGlassOptions) => Promise<LiquidGlassInstance> } }) =>
          LiquidGlass.init({
            root,
            glassElements,
            defaults: DEFAULTS,
          }),
        )
        .then((nextInstance) => {
          if (cancelled) {
            nextInstance.destroy();
            return;
          }
          instance = nextInstance;
        })
        .catch((err) => {
          console.warn("LiquidGlass failed to initialize:", err);
        });
    });

    return () => {
      cancelled = true;
      cancelIdle();
      instance?.destroy();
    };
  }, deps);
}
