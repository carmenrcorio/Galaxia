import {
  BlendMode,
  Canvas,
  ClipOp,
  PaintStyle,
  Picture,
  Skia,
  StrokeCap,
  StrokeJoin,
  TileMode,
  useFont,
  type SkCanvas,
  type SkFont,
  type SkPicture,
} from "@shopify/react-native-skia";
import {
  GLOW_OUTER_SCALE,
  RELATION_LINE_STYLE,
  formFromRelation,
  getMemorialConstellation,
  glyphRadiusPx,
  glowHaloMultiplier,
  resolveNodeColor,
  usesMemorialGlyph,
  type HonorEdge,
} from "@galaxia/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import {
  applyEmaShed,
  basePos,
  bezierCP,
  birthPrecisionSharpness,
  buildConstellationModel,
  clamp01,
  clampGalaxyLabelPosition,
  cohortRgba,
  coreRadius,
  easeOutCubic,
  effectiveFor,
  elementStrokeColor,
  GALAXY_GUIDE_RINGS,
  hexA,
  hitTestAt,
  ignitionAt,
  LABEL_FONT_PX,
  labelPositions,
  linkProgress,
  nodePos,
  quadraticPoint,
  REDUCED_FADE_MS,
  RING_BAND_COLORS,
  ringBandRadius,
  ringStardustPrng,
  SIGN_INDEX,
  twinkleAt,
  type ConstellationModel,
  type ConstellationPerson,
  type EmaShed,
  type SynastryLink,
} from "../lib/constellation-paint";

const INTER_REGULAR = require("../../assets/fonts/Inter-Regular.ttf") as number;

type Meteor = { x0: number; y0: number; x1: number; y1: number; born: number; life: number };

export type ConstellationMapProps = {
  width: number;
  height: number;
  people: ConstellationPerson[];
  links: SynastryLink[];
  honorEdges: HonorEdge[];
  cohortByPerson: Record<string, string>;
  activeTransitIds: readonly string[];
  reduceMotion: boolean;
  onSelectPerson: (personId: string) => void;
};

function makeFill(color: string) {
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  paint.setColor(Skia.Color(color));
  return paint;
}

function makeStroke(color: string, width: number) {
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  paint.setColor(Skia.Color(color));
  paint.setStyle(PaintStyle.Stroke);
  paint.setStrokeWidth(width);
  paint.setStrokeCap(StrokeCap.Round);
  paint.setStrokeJoin(StrokeJoin.Round);
  return paint;
}

function radialPaint(
  cx: number,
  cy: number,
  radius: number,
  colors: string[],
  positions?: number[],
) {
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  paint.setShader(
    Skia.Shader.MakeRadialGradient(
      { x: cx, y: cy },
      radius,
      colors.map((c) => Skia.Color(c)),
      positions ?? null,
      TileMode.Clamp,
    ),
  );
  return paint;
}

function linearPaint(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  colors: string[],
  positions?: number[],
) {
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  paint.setShader(
    Skia.Shader.MakeLinearGradient(
      { x: ax, y: ay },
      { x: bx, y: by },
      colors.map((c) => Skia.Color(c)),
      positions ?? null,
      TileMode.Clamp,
    ),
  );
  return paint;
}

function quadPath(ax: number, ay: number, cpx: number, cpy: number, bx: number, by: number, progress: number) {
  const path = Skia.Path.Make();
  path.moveTo(ax, ay);
  if (progress >= 0.999) {
    path.quadTo(cpx, cpy, bx, by);
    return path;
  }
  const steps = 22;
  for (let k = 1; k <= steps; k++) {
    const tt = (k / steps) * progress;
    const p = quadraticPoint(ax, ay, cpx, cpy, bx, by, tt);
    path.lineTo(p.x, p.y);
  }
  return path;
}

function paintWash(canvas: SkCanvas, width: number, height: number) {
  const paint = Skia.Paint();
  paint.setShader(
    Skia.Shader.MakeLinearGradient(
      { x: width / 2, y: 0 },
      { x: width / 2, y: height },
      [
        Skia.Color("rgba(22,16,46,0.34)"),
        Skia.Color("rgba(12,8,32,0.55)"),
        Skia.Color("rgba(6,4,18,0.82)"),
      ],
      [0, 0.45, 1],
      TileMode.Clamp,
    ),
  );
  canvas.drawPaint(paint);
}

function paintNebulae(
  canvas: SkCanvas,
  model: ConstellationModel,
  positions: { x: number; y: number }[],
  cohortByPerson: Record<string, string>,
  t: number,
  nebFade: number,
  reduced: boolean,
  lowPerf: boolean,
) {
  const groups = new Map<string, number[]>();
  for (let i = 0; i < model.people.length; i++) {
    const key = cohortByPerson[model.people[i].id];
    if (!key) continue;
    const arr = groups.get(key);
    if (arr) arr.push(i);
    else groups.set(key, [i]);
  }
  if (groups.size === 0) return;

  groups.forEach((idxs, key) => {
    let cxm = 0;
    let cym = 0;
    for (const i of idxs) {
      cxm += positions[i].x;
      cym += positions[i].y;
    }
    cxm /= idxs.length;
    cym /= idxs.length;
    let rad = 0;
    for (const i of idxs) rad = Math.max(rad, Math.hypot(positions[i].x - cxm, positions[i].y - cym));
    rad = Math.max(rad, 54) + 96;
    const si = SIGN_INDEX[key] ?? 0;
    const puffCount = lowPerf ? 2 : 3;
    for (let k = 0; k < puffCount; k++) {
      const seed = si * 13 + k * 7;
      const drift = reduced ? 0 : Math.sin(t * 0.0004 + seed);
      const ang = seed * 1.7;
      const dist = (k === 0 ? 0 : rad * 0.34) * (0.82 + 0.18 * drift);
      const ox = cxm + Math.cos(ang) * dist;
      const oy = cym + Math.sin(ang) * dist * 0.8;
      const pr = rad * (k === 0 ? 1 : 0.66) * (1 + (reduced ? 0 : 0.05 * drift));
      const paint = radialPaint(
        ox,
        oy,
        pr,
        [cohortRgba(si, 0.12 * nebFade), cohortRgba(si, 0.05 * nebFade), cohortRgba(si, 0)],
        [0, 0.5, 1],
      );
      paint.setBlendMode(BlendMode.Plus);
      canvas.drawCircle(ox, oy, pr, paint);
    }
  });
}

function recordAtmosphere(
  model: ConstellationModel,
  positions: { x: number; y: number }[],
  cohortByPerson: Record<string, string>,
  t: number,
  nebFade: number,
  reduced: boolean,
  lowPerf: boolean,
): SkPicture {
  const recorder = Skia.PictureRecorder();
  const canvas = recorder.beginRecording(Skia.XYWHRect(0, 0, model.width, model.height));
  paintWash(canvas, model.width, model.height);
  if (nebFade > 0.001) {
    paintNebulae(canvas, model, positions, cohortByPerson, t, nebFade, reduced, lowPerf);
  }
  return recorder.finishRecordingAsPicture();
}

function paintGuideRings(canvas: SkCanvas, model: ConstellationModel) {
  const { cx, cy, radX, radY } = model.geom;
  for (const ring of GALAXY_GUIDE_RINGS) {
    const band = RING_BAND_COLORS[ring];
    const rn = ringBandRadius(ring);
    const rx = radX * rn;
    const ry = radY * rn;
    const oval = Skia.XYWHRect(cx - rx, cy - ry, rx * 2, ry * 2);

    const glow = makeStroke(band.glow, band.width * 1.8);
    glow.setAlphaf(band.opacity * 0.5);
    glow.setImageFilter(Skia.ImageFilter.MakeBlur(band.width * 2.4, band.width * 2.4, TileMode.Clamp, null));
    canvas.drawOval(oval, glow);

    const core = makeStroke(band.core, band.width * 0.7);
    core.setAlphaf(band.opacity);
    canvas.drawOval(oval, core);

    const count = Math.min(80, Math.max(20, Math.round((2 * Math.PI * rx) / 8)));
    const seed = ring * 31;
    const dust = Skia.Paint();
    dust.setAntiAlias(true);
    dust.setColor(Skia.Color(band.core));
    for (let i = 0; i < count; i++) {
      const angle = ringStardustPrng(i, seed) * Math.PI * 2;
      const spread = (ringStardustPrng(i + count, seed) - 0.5) * 12;
      const px = cx + Math.cos(angle) * (rx + spread);
      const py = cy + Math.sin(angle) * (ry + spread);
      const size = ringStardustPrng(i + count * 2, seed) * 1.2 + 0.3;
      dust.setAlphaf(ringStardustPrng(i + count * 3, seed) * 0.35 + 0.05);
      canvas.drawCircle(px, py, size, dust);
    }
  }
}

function drawSynastryLink(
  canvas: SkCanvas,
  link: SynastryLink,
  posA: { x: number; y: number },
  posB: { x: number; y: number },
  progress: number,
  t: number,
  reduced: boolean,
  linkIdx: number,
) {
  const { cpx, cpy } = bezierCP(posA.x, posA.y, posB.x, posB.y);
  const colA = elementStrokeColor(link.elA);
  const colB = elementStrokeColor(link.elB);
  const midA = link.scoreA >= 62 ? 0.28 : 0.16;
  const path = quadPath(posA.x, posA.y, cpx, cpy, posB.x, posB.y, progress);
  const stroke = linearPaint(
    posA.x,
    posA.y,
    posB.x,
    posB.y,
    [hexA(colA, 0), hexA(colA, midA), hexA(colB, 0.05)],
    [0, 0.5, 1],
  );
  stroke.setStyle(PaintStyle.Stroke);
  stroke.setStrokeWidth(0.8);
  stroke.setAntiAlias(true);
  canvas.drawPath(path, stroke);

  if (!reduced && progress >= 0.999) {
    const tt = (t * 0.0002 + linkIdx * 0.3) % 1;
    const p = quadraticPoint(posA.x, posA.y, cpx, cpy, posB.x, posB.y, tt);
    canvas.drawCircle(p.x, p.y, 1.2, makeFill(`rgba(244,236,219,${0.5 * Math.sin(tt * Math.PI)})`));
  }
}

function drawHonorLink(
  canvas: SkCanvas,
  edge: HonorEdge,
  posA: { x: number; y: number },
  posB: { x: number; y: number },
  progress: number,
  t: number,
  reduced: boolean,
  edgeIndex: number,
) {
  const style = RELATION_LINE_STYLE[edge.relationType];
  if (!style) return;
  const { cpx, cpy } = bezierCP(posA.x, posA.y, posB.x, posB.y);
  const path = quadPath(posA.x, posA.y, cpx, cpy, posB.x, posB.y, progress);

  const wash = linearPaint(
    posA.x,
    posA.y,
    posB.x,
    posB.y,
    [hexA(style.water, 0), hexA(style.water, style.washAlpha * progress), hexA(style.ancient, 0)],
    [0, 0.5, 1],
  );
  wash.setStyle(PaintStyle.Stroke);
  wash.setStrokeWidth(style.lineWidth + 2.2);
  wash.setAntiAlias(true);
  canvas.drawPath(path, wash);

  const stroke = linearPaint(
    posA.x,
    posA.y,
    posB.x,
    posB.y,
    [
      hexA(style.water, style.strokeAlpha * 0.4 * progress),
      hexA(style.water, style.strokeAlpha * progress),
      hexA(style.ancient, style.strokeAlpha * 0.85 * progress),
    ],
    [0, 0.5, 1],
  );
  stroke.setStyle(PaintStyle.Stroke);
  stroke.setStrokeWidth(style.lineWidth);
  stroke.setAntiAlias(true);
  stroke.setStrokeCap(StrokeCap.Round);
  if (progress >= 0.999) {
    stroke.setPathEffect(Skia.PathEffect.MakeDash([...style.dash], reduced ? 0 : -t * 0.012));
  }
  canvas.drawPath(path, stroke);

  if (!reduced && progress >= 0.999) {
    const tt = (t * 0.00011 + edgeIndex * 0.37) % 1;
    const p = quadraticPoint(posA.x, posA.y, cpx, cpy, posB.x, posB.y, tt);
    const pr = style.pulseRadius * (0.7 + 0.3 * Math.sin(tt * Math.PI));
    const pulse = radialPaint(
      p.x,
      p.y,
      pr * 3,
      [
        hexA(style.water, 0.55 * Math.sin(tt * Math.PI)),
        hexA(style.ancient, 0.22 * Math.sin(tt * Math.PI)),
        hexA(style.water, 0),
      ],
      [0, 0.5, 1],
    );
    canvas.drawCircle(p.x, p.y, pr * 3, pulse);
  }
}

function drawMeteors(
  canvas: SkCanvas,
  meteors: Meteor[],
  t: number,
  reduced: boolean,
  meteorsOff: boolean,
) {
  if (reduced || meteorsOff) return;
  for (const m of meteors) {
    const u = (t - m.born) / m.life;
    if (u < 0 || u >= 1) continue;
    const cxp = m.x0 + (m.x1 - m.x0) * u;
    const cyp = m.y0 + (m.y1 - m.y0) * u;
    const trail = 0.07;
    const pxp = m.x0 + (m.x1 - m.x0) * Math.max(0, u - trail);
    const pyp = m.y0 + (m.y1 - m.y0) * Math.max(0, u - trail);
    const fade = Math.sin(u * Math.PI);
    const path = Skia.Path.Make();
    path.moveTo(pxp, pyp);
    path.lineTo(cxp, cyp);
    const stroke = linearPaint(pxp, pyp, cxp, cyp, ["rgba(244,236,219,0)", `rgba(244,236,219,${0.38 * fade})`]);
    stroke.setStyle(PaintStyle.Stroke);
    stroke.setStrokeWidth(1.05);
    stroke.setAntiAlias(true);
    canvas.drawPath(path, stroke);
    canvas.drawCircle(cxp, cyp, 1.05, makeFill(`rgba(244,236,219,${0.55 * fade})`));
  }
}

function drawLabel(
  canvas: SkCanvas,
  font: SkFont | null,
  name: string,
  rawX: number,
  rawY: number,
  color: string,
  width: number,
  height: number,
) {
  if (!font) return;
  const bounds = font.measureText(name);
  const textWidth = bounds.width;
  const textHeight = Math.max(LABEL_FONT_PX, bounds.height);
  const { x, y } = clampGalaxyLabelPosition(rawX, rawY, textWidth, textHeight, width, height);
  const paint = makeFill(color);
  canvas.drawText(name, x - textWidth / 2, y, paint, font);
}

function drawMemorialGlyph(
  canvas: SkCanvas,
  q: { x: number; y: number },
  col: string,
  pattern: NonNullable<ReturnType<typeof getMemorialConstellation>>,
  scale: number,
  twinkle: number,
  starScale: unknown,
  lowPerf: boolean,
  reduced: boolean,
) {
  const radius = glyphRadiusPx(lowPerf, starScale) * scale;
  const lineW = lowPerf ? 0.85 : 1.05;
  const starR = (lowPerf ? 1.25 : 1.45) * scale;
  const lineA = 0.58 * (reduced ? 1 : twinkle);
  const starA = 0.82 * (reduced ? 1 : twinkle);

  if (!lowPerf) {
    canvas.drawCircle(
      q.x,
      q.y,
      radius * 1.55,
      radialPaint(q.x, q.y, radius * 1.55, [hexA(col, 0.14), hexA(col, 0)], [0, 1]),
    );
  }

  const pts = pattern.stars.map(([nx, ny]) => ({
    x: q.x + nx * radius,
    y: q.y - ny * radius,
  }));
  const line = makeStroke(hexA(col, lineA), lineW);
  for (const [a, b] of pattern.lines) {
    const pa = pts[a];
    const pb = pts[b];
    if (!pa || !pb) continue;
    const path = Skia.Path.Make();
    path.moveTo(pa.x, pa.y);
    path.lineTo(pb.x, pb.y);
    canvas.drawPath(path, line);
  }
  const star = makeFill(hexA(col, starA));
  for (const pt of pts) canvas.drawCircle(pt.x, pt.y, starR, star);
}

function drawGlow(
  canvas: SkCanvas,
  q: { x: number; y: number },
  col: string,
  R: number,
  sharpness: number,
  intensity: number,
  scale: number,
  lowPerf: boolean,
) {
  const haloR = R * glowHaloMultiplier(sharpness) * scale * GLOW_OUTER_SCALE;
  canvas.drawCircle(
    q.x,
    q.y,
    haloR,
    radialPaint(
      q.x,
      q.y,
      haloR,
      [
        hexA(col, (0.5 * sharpness + 0.16) * intensity * GLOW_OUTER_SCALE),
        hexA(col, 0.12 * sharpness * intensity * GLOW_OUTER_SCALE),
        hexA(col, 0),
      ],
      [0, 0.35, 1],
    ),
  );
  if (!lowPerf) {
    const coreR2 = R * (sharpness === 1 ? 2.8 : sharpness > 0.5 ? 2.4 : 2.0) * scale;
    canvas.drawCircle(
      q.x,
      q.y,
      coreR2,
      radialPaint(
        q.x,
        q.y,
        coreR2,
        [
          hexA("#ffffff", (0.55 * sharpness + 0.12) * intensity),
          hexA(col, 0.28 * sharpness * intensity),
          hexA(col, 0),
        ],
        [0, 0.5, 1],
      ),
    );
  }
}

function drawBody(
  canvas: SkCanvas,
  model: ConstellationModel,
  i: number,
  q: { x: number; y: number },
  labelPos: { x: number; y: number },
  t: number,
  elapsed: number,
  reduced: boolean,
  globalFade: number,
  lowPerf: boolean,
  isActive: boolean,
  font: SkFont | null,
) {
  const p = model.people[i];
  const col = resolveNodeColor(p);
  const s = birthPrecisionSharpness(p.birth_precision);
  const R0 = coreRadius(p, lowPerf);
  const form = formFromRelation(p.is_self, p.relation, p.passed_at);
  const memorialPattern = usesMemorialGlyph(p) ? getMemorialConstellation(p.memorial_constellation) : null;
  const ign = ignitionAt(model, p.id, elapsed, reduced, globalFade);
  if (ign.alpha <= 0.001) return;
  const scale = reduced ? 1 : Math.max(0.001, ign.scale);
  const R = R0 * scale;
  const tw = twinkleAt(model.phases[i], t, reduced);
  const bodyAlpha = reduced ? globalFade : easeOutCubic(ign.raw);
  canvas.save();
  /* Skia has no globalAlpha; fold it into paints via a layer. */
  const layerPaint = Skia.Paint();
  layerPaint.setAlphaf(bodyAlpha);
  canvas.saveLayer(layerPaint, Skia.XYWHRect(q.x - 80, q.y - 80, 160, 160));

  if (memorialPattern) {
    drawMemorialGlyph(canvas, q, col, memorialPattern, scale, tw, p.star_scale, lowPerf, reduced);
    if (isActive && !reduced) {
      canvas.drawCircle(
        q.x,
        q.y,
        R0 * (1.55 + 0.25 * Math.sin(t * 0.025 + model.phases[i].ph)),
        makeStroke(hexA(col, 0.22), 1),
      );
    }
    const litM = Math.max(0.78, 0.45 + 0.4 * s);
    const uncertainM = !p.is_self && s < 1;
    drawLabel(
      canvas,
      font,
      p.display_name,
      labelPos.x,
      labelPos.y,
      uncertainM ? `rgba(168,160,198,${litM})` : `rgba(185,174,222,${litM})`,
      model.width,
      model.height,
    );
    canvas.restore();
    canvas.restore();
    return;
  }

  drawGlow(canvas, q, col, R0, s, tw, scale, lowPerf);

  if (ign.flare > 0) {
    const fr = R0 * (s === 1 ? 5.5 : 8) * (1.2 + 0.6 * ign.flare);
    canvas.drawCircle(
      q.x,
      q.y,
      fr,
      radialPaint(
        q.x,
        q.y,
        fr,
        [
          hexA("#ffffff", (p.is_self ? 0.5 : 0.32) * ign.flare),
          hexA(col, 0.2 * ign.flare),
          hexA(col, 0),
        ],
        [0, 0.5, 1],
      ),
    );
  }

  if (form === "binary") {
    const baseAng = effectiveFor(model, p, lowPerf).angle;
    const a = reduced ? baseAng : baseAng + t * 0.000286;
    const sep = 10;
    const cx2 = q.x + Math.cos(a) * sep;
    const cy2 = q.y + Math.sin(a) * sep * 0.55;
    canvas.drawOval(Skia.XYWHRect(q.x - sep, q.y - sep * 0.55, sep * 2, sep * 1.1), makeStroke(hexA(col, 0.34), 1));
    canvas.drawCircle(q.x, q.y, R * 0.92, makeFill(col));
    canvas.drawCircle(q.x, q.y, R * 0.4, makeFill("rgba(255,255,255,.92)"));
    const or_ = R * 0.48;
    canvas.drawCircle(
      cx2,
      cy2,
      or_ * 2.2,
      radialPaint(cx2, cy2, or_ * 2.2, [hexA(col, 0.45 * tw), hexA(col, 0)], [0, 1]),
    );
    canvas.drawCircle(cx2, cy2, or_, makeFill(col));
  } else if (form === "moon") {
    canvas.drawCircle(q.x, q.y, R, makeFill(hexA(col, 0.3)));
    const clip = Skia.Path.Make();
    clip.addCircle(q.x, q.y, R);
    canvas.save();
    canvas.clipPath(clip, ClipOp.Intersect, true);
    const off = R * 0.62;
    canvas.drawCircle(q.x - off * 0.55, q.y - off * 0.42, R * 1.02, makeFill(col));
    const sh = reduced ? 0 : 0.5 + 0.5 * Math.sin(t * 0.0012 + model.phases[i].ph);
    canvas.drawCircle(
      q.x - off * 0.55,
      q.y - off * 0.42,
      R * 1.02,
      makeFill(`rgba(255,255,255,${0.06 + 0.08 * sh})`),
    );
    canvas.restore();
    canvas.drawCircle(q.x, q.y, R, makeStroke(hexA(col, 0.5), 0.8));
  } else if (form === "fixed") {
    const fl = R * 3.1;
    const flares = Skia.Path.Make();
    flares.moveTo(q.x - fl, q.y);
    flares.lineTo(q.x + fl, q.y);
    flares.moveTo(q.x, q.y - fl);
    flares.lineTo(q.x, q.y + fl);
    canvas.drawPath(flares, makeStroke(hexA(col, 0.42 * tw), 0.9));
    canvas.drawCircle(q.x, q.y, R, makeFill(col));
    canvas.drawCircle(q.x, q.y, R * 0.42, makeFill("rgba(255,255,255,.95)"));
  } else if (form === "ancient") {
    const rr = R * (1 + (reduced ? 0 : 0.06 * Math.sin(t * 0.0011 + model.phases[i].ph)));
    canvas.drawCircle(q.x, q.y, rr, makeFill(hexA(col, 0.62)));
    const ringR = R * (4.4 + (reduced ? 0 : (Math.sin(t * 0.0007 + model.phases[i].ph) + 1) * 1.5));
    canvas.drawCircle(q.x, q.y, ringR, makeStroke(hexA(col, 0.13), 1));
  } else if (form === "self") {
    canvas.drawCircle(q.x, q.y, R, makeFill(col));
    canvas.drawCircle(q.x, q.y, R * 0.45, makeFill("rgba(255,255,255,.97)"));
    canvas.drawCircle(q.x, q.y, R * 1.85, makeStroke(hexA(col, 0.3), 1));
  } else {
    canvas.drawCircle(q.x, q.y, R, makeFill(col));
    canvas.drawCircle(q.x, q.y, R * 0.4, makeFill("rgba(255,255,255,.90)"));
  }

  if (isActive && !reduced) {
    canvas.drawCircle(
      q.x,
      q.y,
      R0 * (2.8 + 0.8 * Math.sin(t * 0.025 + model.phases[i].ph)),
      makeStroke(hexA(col, 0.25), 1),
    );
  }

  const lit = Math.max(0.78, 0.45 + 0.4 * s);
  const uncertain = !p.is_self && s < 1;
  const labelColor = p.is_self
    ? `rgba(244,236,219,${Math.max(lit, 0.9)})`
    : uncertain
      ? `rgba(168,160,198,${lit})`
      : `rgba(185,174,222,${lit})`;
  drawLabel(canvas, font, p.display_name, labelPos.x, labelPos.y, labelColor, model.width, model.height);

  canvas.restore();
  canvas.restore();
}

function recordMotion(
  model: ConstellationModel,
  positions: { x: number; y: number }[],
  labels: Map<string, { x: number; y: number }>,
  t: number,
  elapsed: number,
  reduced: boolean,
  globalFade: number,
  lowPerf: boolean,
  meteorsOff: boolean,
  meteors: Meteor[],
  activeTransitIds: readonly string[],
  font: SkFont | null,
): SkPicture {
  const recorder = Skia.PictureRecorder();
  const canvas = recorder.beginRecording(Skia.XYWHRect(0, 0, model.width, model.height));
  paintGuideRings(canvas, model);

  const byId = new Map(model.people.map((p, i) => [p.id, positions[i]]));
  model.links.forEach((link, idx) => {
    const posA = byId.get(link.fromId);
    const posB = byId.get(link.toId);
    if (!posA || !posB) return;
    const progress = linkProgress(model, link.fromId, link.toId, elapsed, reduced, globalFade, 0.5);
    if (progress <= 0.001) return;
    drawSynastryLink(canvas, link, posA, posB, progress, t, reduced, idx);
  });
  model.honorEdges.forEach((edge, edgeIndex) => {
    const posA = byId.get(edge.fromId);
    const posB = byId.get(edge.toId);
    if (!posA || !posB) return;
    const progress = linkProgress(model, edge.fromId, edge.toId, elapsed, reduced, globalFade, 0.55);
    if (progress <= 0.001) return;
    drawHonorLink(canvas, edge, posA, posB, progress, t, reduced, edgeIndex);
  });

  drawMeteors(canvas, meteors, t, reduced, meteorsOff);

  for (let i = 0; i < model.people.length; i++) {
    const q = positions[i];
    const lp = labels.get(model.people[i].id) ?? { x: q.x, y: q.y + 20 };
    drawBody(
      canvas,
      model,
      i,
      q,
      lp,
      t,
      elapsed,
      reduced,
      globalFade,
      lowPerf,
      activeTransitIds.includes(model.people[i].id),
      font,
    );
  }

  return recorder.finishRecordingAsPicture();
}

export function ConstellationMap({
  width,
  height,
  people,
  links,
  honorEdges,
  cohortByPerson,
  activeTransitIds,
  reduceMotion,
  onSelectPerson,
}: ConstellationMapProps) {
  const font = useFont(INTER_REGULAR, LABEL_FONT_PX);
  const model = useMemo(
    () => buildConstellationModel({ people, links, honorEdges, width, height }),
    [people, links, honorEdges, width, height],
  );
  const [atmPicture, setAtmPicture] = useState<SkPicture | null>(null);
  const [motionPicture, setMotionPicture] = useState<SkPicture | null>(null);

  const hitRef = useRef<{ model: ConstellationModel; positions: { x: number; y: number }[]; lite: boolean }>({
    model,
    positions: people.map((p) => basePos(model, p, false)),
    lite: false,
  });
  const animRef = useRef({
    lastFrame: 0,
    entranceStart: 0 as number | null,
    entranceKey: "",
    lastAtmBake: 0,
    ema: { emaFrameMs: 16.7, warmup: 0, meteorsOff: reduceMotion, lowPerf: false } as EmaShed,
    meteors: [] as Meteor[],
    nextMeteorAt: 0,
  });

  useEffect(() => {
    if (width < 2 || height < 2 || people.length === 0) return;
    const anim = animRef.current;
    const entranceKey = [...people.map((p) => p.id)].sort().join(",");
    if (entranceKey !== anim.entranceKey) {
      anim.entranceKey = entranceKey;
      anim.entranceStart = null;
      anim.lastFrame = 0;
      anim.lastAtmBake = 0;
      anim.ema = { emaFrameMs: 16.7, warmup: 0, meteorsOff: reduceMotion, lowPerf: false };
      anim.meteors = [];
      anim.nextMeteorAt = 0;
    }

    let raf = 0;
    let cancelled = false;

    const draw = (now: number) => {
      if (cancelled) return;
      if (anim.entranceStart == null) anim.entranceStart = now;
      const elapsed = now - anim.entranceStart;
      const globalFade = reduceMotion ? clamp01(elapsed / REDUCED_FADE_MS) : 1;
      const dt = anim.lastFrame === 0 ? 16.7 : now - anim.lastFrame;
      anim.lastFrame = now;

      const budgetArmed = reduceMotion
        ? elapsed > REDUCED_FADE_MS + 200
        : elapsed > model.totalDuration + 400;
      if (budgetArmed) {
        anim.ema = applyEmaShed(anim.ema, dt, reduceMotion);
      }
      const lite = anim.ema.lowPerf;

      const positions = model.people.map((_, i) =>
        nodePos(model, i, now, elapsed, reduceMotion, globalFade, lite),
      );
      hitRef.current = { model, positions, lite };
      const labels = labelPositions(model, positions, lite);

      const nebFade = reduceMotion ? globalFade : clamp01((elapsed - 200) / 1200);
      const bakeEvery = nebFade < 0.999 ? 120 : 250;
      if (anim.lastAtmBake === 0 || now - anim.lastAtmBake > bakeEvery) {
        setAtmPicture(
          recordAtmosphere(model, positions, cohortByPerson, now, nebFade, reduceMotion, lite),
        );
        anim.lastAtmBake = now;
      }

      if (!reduceMotion && !anim.ema.meteorsOff) {
        if (anim.nextMeteorAt === 0) anim.nextMeteorAt = now + 5200 + Math.random() * 2800;
        if (now >= anim.nextMeteorAt) {
          anim.nextMeteorAt = now + 7000 + Math.random() * 8000;
          if (Math.random() < 0.45 && anim.meteors.length < 2) {
            const x0 = width * (0.08 + Math.random() * 0.84);
            const y0 = height * (0.06 + Math.random() * 0.42);
            const dir = Math.random() < 0.5 ? 1 : -1;
            const ang = 0.35 + Math.random() * 0.55;
            const len = 56 + Math.random() * 48;
            anim.meteors.push({
              x0,
              y0,
              x1: x0 + Math.cos(ang) * len * dir,
              y1: y0 + Math.sin(ang) * len,
              born: now,
              life: 620 + Math.random() * 420,
            });
          }
        }
        anim.meteors = anim.meteors.filter((m) => (now - m.born) / m.life < 1);
      } else if (anim.meteors.length) {
        anim.meteors = [];
      }

      setMotionPicture(
        recordMotion(
          model,
          positions,
          labels,
          now,
          elapsed,
          reduceMotion,
          globalFade,
          lite,
          anim.ema.meteorsOff,
          anim.meteors,
          activeTransitIds,
          font,
        ),
      );

      if (!reduceMotion) raf = requestAnimationFrame(draw);
      else if (globalFade < 1) raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [model, width, height, people, cohortByPerson, activeTransitIds, reduceMotion, font]);

  const onPress = useCallback(
    (event: { nativeEvent: { locationX: number; locationY: number } }) => {
      const { locationX, locationY } = event.nativeEvent;
      const hit = hitTestAt(
        hitRef.current.model,
        locationX,
        locationY,
        hitRef.current.positions,
        hitRef.current.lite,
      );
      if (hit) onSelectPerson(hit.id);
    },
    [onSelectPerson],
  );

  if (width < 2 || height < 2) return null;

  return (
    <Pressable
      accessibilityRole="image"
      accessibilityLabel="Constellation. Tap a star to open a profile."
      onPress={onPress}
      style={{ width, height }}
    >
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        {atmPicture ? <Picture picture={atmPicture} /> : null}
        {motionPicture ? <Picture picture={motionPicture} /> : null}
      </Canvas>
    </Pressable>
  );
}
