import {
  Canvas,
  Picture,
  Skia,
  TileMode,
  type SkPicture
} from "@shopify/react-native-skia";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import {
  buildRuntimeLayers,
  lerpToward,
  nextEmaFrameMs,
  shedFarLayer,
  starAlpha,
  STAR_CREAM_HEX,
  starDrawXY,
  STARFIELD_LAYERS,
  type RuntimeLayer
} from "../lib/starfield";
import { useAccessibilitySettings } from "../providers/accessibility-provider";

/**
 * Native CosmicBackground. Same three parallax layers, cream stars, aura,
 * milkyway, vignette, and reduced-motion freeze as
 * `apps/web/components/cosmic-background.tsx`. Stars are recorded into a
 * Skia picture (not one Circle per star). Gyro / pointer parallax no-ops
 * without a sensor, same as web when deviceorientation is silent.
 */

function recordSky(width: number, height: number, layers: RuntimeLayer[], activeLayers: number, reduceMotion: boolean): SkPicture {
  const recorder = Skia.PictureRecorder();
  const canvas = recorder.beginRecording(Skia.XYWHRect(0, 0, width, height));

  const fill = Skia.Paint();
  fill.setShader(
    Skia.Shader.MakeLinearGradient(
      { x: 0, y: 0 },
      { x: 0, y: height },
      [Skia.Color("#0a0717"), Skia.Color("#0c0820"), Skia.Color("#0a0717")],
      [0, 0.4, 1],
      TileMode.Clamp
    )
  );
  canvas.drawPaint(fill);

  const aura = (
    cx: number,
    cy: number,
    radius: number,
    color: string
  ) => {
    const paint = Skia.Paint();
    paint.setShader(
      Skia.Shader.MakeRadialGradient(
        { x: cx, y: cy },
        radius,
        [Skia.Color(color), Skia.Color("rgba(10,7,23,0)")],
        [0, 1],
        TileMode.Clamp
      )
    );
    canvas.drawPaint(paint);
  };
  aura(width * 0.78, height * -0.05, Math.max(width, height) * 0.85, "rgba(110,177,184,0.10)");
  aura(width * 0.12, height * 0.08, Math.max(width, height) * 0.7, "rgba(183,154,216,0.12)");
  aura(width * 0.5, height * 1.2, Math.max(width, height) * 0.9, "rgba(230,174,108,0.08)");

  canvas.save();
  canvas.rotate(-18, width / 2, height / 2);
  const milky = Skia.Paint();
  milky.setShader(
    Skia.Shader.MakeRadialGradient(
      { x: width / 2, y: height / 2 },
      Math.max(width, height) * 0.55,
      [Skia.Color("rgba(183,154,216,0.07)"), Skia.Color("rgba(183,154,216,0)")],
      [0, 0.7],
      TileMode.Clamp
    )
  );
  milky.setImageFilter(Skia.ImageFilter.MakeBlur(10, 10, TileMode.Clamp, null));
  canvas.drawPaint(milky);
  canvas.restore();

  const starPaint = Skia.Paint();
  starPaint.setAntiAlias(true);
  const cream = Skia.Color(STAR_CREAM_HEX);
  const start = layers.length - activeLayers;
  for (let li = start; li < layers.length; li++) {
    const layer = layers[li];
    for (let i = 0; i < layer.stars.length; i++) {
      const star = layer.stars[i];
      const { x, y } = starDrawXY(star, layer, width, height);
      starPaint.setColor(cream);
      starPaint.setAlphaf(Math.max(0, Math.min(1, starAlpha(star, reduceMotion))));
      canvas.drawCircle(x, y, star.r, starPaint);
    }
  }

  const vignette = Skia.Paint();
  vignette.setShader(
    Skia.Shader.MakeRadialGradient(
      { x: width / 2, y: height / 2 },
      Math.hypot(width, height) * 0.62,
      [Skia.Color("rgba(5,3,12,0)"), Skia.Color("rgba(5,3,12,0.9)")],
      [0.55, 1],
      TileMode.Clamp
    )
  );
  canvas.drawPaint(vignette);

  return recorder.finishRecordingAsPicture();
}

export function CosmicBackground() {
  const { reduceMotion } = useAccessibilitySettings();
  const { width, height } = useWindowDimensions();
  const [picture, setPicture] = useState<SkPicture | null>(null);
  const layersRef = useRef<RuntimeLayer[] | null>(null);
  const animRef = useRef({
    targetX: 0,
    targetY: 0,
    activeLayers: STARFIELD_LAYERS.length,
    emaFrameMs: 16.7,
    lastFrame: 0,
    warmup: 0
  });

  useEffect(() => {
    if (width < 2 || height < 2) return;
    layersRef.current = buildRuntimeLayers(width, height);
    const anim = animRef.current;
    anim.activeLayers = STARFIELD_LAYERS.length;
    anim.emaFrameMs = 16.7;
    anim.lastFrame = 0;
    anim.warmup = 0;

    let raf = 0;
    let cancelled = false;

    const draw = (now: number) => {
      if (cancelled) return;
      const layers = layersRef.current;
      if (!layers) return;
      const dt = anim.lastFrame === 0 ? 16.7 : now - anim.lastFrame;
      anim.lastFrame = now;
      if (!reduceMotion) {
        anim.emaFrameMs = anim.warmup > 10 ? nextEmaFrameMs(anim.emaFrameMs, dt) : anim.emaFrameMs;
        anim.activeLayers = shedFarLayer(anim.activeLayers, layers.length, anim.emaFrameMs, anim.warmup);
        anim.warmup += 1;
      }
      for (const layer of layers) {
        const tox = reduceMotion ? 0 : anim.targetX * layer.spec.parallax;
        const toy = reduceMotion ? 0 : anim.targetY * layer.spec.parallax;
        layer.ox = lerpToward(layer.ox, tox);
        layer.oy = lerpToward(layer.oy, toy);
        if (!reduceMotion) {
          for (const star of layer.stars) star.a += star.tw;
        }
      }
      setPicture(recordSky(width, height, layers, anim.activeLayers, reduceMotion));
      if (!reduceMotion) raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [width, height, reduceMotion]);

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
    >
      <Canvas style={StyleSheet.absoluteFill}>
        {picture ? <Picture picture={picture} /> : null}
      </Canvas>
    </View>
  );
}
