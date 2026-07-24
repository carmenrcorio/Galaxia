/**
 * Memorial constellation library — static stick figures for Remembrance (P3).
 *
 * Real star topology only: Hipparcos J2000 positions (VizieR I/239/hip_main)
 * projected to a local tangent plane, barycenter at origin, scaled into roughly
 * [-1, 1]. Line index pairs follow traditional / IAU-simplified stick figures
 * (bright primary asterisms). Ursa Major uses the Plough / Big Dipper asterism
 * — the recognizable bright figure within that constellation.
 *
 * No network fetch at runtime. Unknown / empty `people.memorial_constellation`
 * values do not invent a pattern — the galaxy keeps ancient light.
 */

export interface MemorialConstellation {
  /** Stable id persisted on `people.memorial_constellation`. */
  id: string;
  /** Display name — FOUNDER-REVIEW. */
  name: string;
  /** IAU abbreviation (e.g. Cas, Ori). */
  iau: string;
  /** One-line sky description for the picker — FOUNDER-REVIEW. */
  summary: string;
  /** Curated Greco-Roman myth for meaningful choice — FOUNDER-REVIEW. Real mythology only; never generated. */
  myth: string;
  /** Normalized star coords in roughly [-1, 1]; barycenter near origin. */
  stars: ReadonlyArray<readonly [number, number]>;
  /** Undirected line segments as [starIndexA, starIndexB]. */
  lines: ReadonlyArray<readonly [number, number]>;
}

/**
 * Curated memorial patterns (16). Order matches the picker.
 * Display names marked FOUNDER-REVIEW.
 */
export const MEMORIAL_CONSTELLATIONS = [
  {
    id: "cassiopeia",
    // FOUNDER-REVIEW: constellation display name
    name: "Cassiopeia",
    iau: "Cas",
    // FOUNDER-REVIEW: one-line sky description
    summary: "A bright W of five stars near the north celestial pole.",
    // FOUNDER-REVIEW: traditional myth — real mythology only
    myth: "The vain queen who boasted she was more beautiful than the sea nymphs. Poseidon bound her to her throne in the sky, circling the pole forever, upside down half the night as humbling for her pride.",
    stars: [
      [0.92, 0.5013],
      [0.4246, 0.0241],
      [-0.0799, 0.091],
      [-0.3608, -0.4897],
      [-0.9039, -0.1267],
    ],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4]],
  },
  {
    id: "orion",
    // FOUNDER-REVIEW: constellation display name
    name: "Orion",
    iau: "Ori",
    // FOUNDER-REVIEW: one-line sky description
    summary: "The hunter — three belt stars between bright shoulders and knees.",
    // FOUNDER-REVIEW: traditional myth — real mythology only
    myth: "The great hunter, son of Poseidon, who could walk on water. Slain by a scorpion's sting and placed among the stars, still striding across the winter sky with his belt and sword.",
    stars: [
      [-0.2471, 0.5587],
      [-0.0162, 0.8896],
      [0.4461, 0.6563],
      [-0.0884, -0.055],
      [0.0086, -0.1384],
      [0.1135, -0.2067],
      [-0.4916, -0.7845],
      [0.275, -0.92],
    ],
    lines: [[0, 1], [1, 2], [0, 3], [3, 4], [4, 5], [2, 5], [3, 6], [5, 7]],
  },
  {
    id: "lyra",
    // FOUNDER-REVIEW: constellation display name
    name: "Lyra",
    iau: "Lyr",
    // FOUNDER-REVIEW: one-line sky description
    summary: "Vega and a small parallelogram — a compact lyre.",
    // FOUNDER-REVIEW: traditional myth — real mythology only
    myth: "The lyre of Orpheus, whose music could charm stones, tame beasts, and soften the hearts of the dead. After his death Zeus set his instrument in the sky.",
    stars: [
      [-0.551, 0.5545],
      [-0.1892, 0.755],
      [-0.1701, 0.2693],
      [0.088, -0.7571],
      [0.519, -0.92],
      [0.3032, 0.0984],
    ],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [2, 5]],
  },
  {
    id: "cygnus",
    // FOUNDER-REVIEW: constellation display name
    name: "Cygnus",
    iau: "Cyg",
    // FOUNDER-REVIEW: one-line sky description
    summary: "The Northern Cross — wings spread along the Milky Way.",
    // FOUNDER-REVIEW: traditional myth — real mythology only
    myth: "The swan. In one telling, Zeus in swan form; in another, the grieving friend of Phaethon who dove again and again into the river for his body until the gods, moved by his loyalty, made him a swan among the stars.",
    stars: [
      [0.4652, 0.3491],
      [0.2069, -0.0055],
      [0.5295, -0.4492],
      [0.889, -0.7134],
      [-0.4859, -0.8734],
      [-0.1418, -0.3706],
      [-0.2942, 0.3386],
      [-0.4996, 0.8043],
      [-0.6691, 0.92],
    ],
    lines: [[0, 1], [1, 2], [2, 3], [4, 5], [1, 5], [1, 6], [6, 7], [7, 8]],
  },
  {
    id: "scorpius",
    // FOUNDER-REVIEW: constellation display name
    name: "Scorpius",
    iau: "Sco",
    // FOUNDER-REVIEW: one-line sky description
    summary: "A long curved body ending in a hooked stinger.",
    // FOUNDER-REVIEW: traditional myth — real mythology only
    myth: "The scorpion sent by Gaia to kill Orion. The two were placed at opposite ends of the sky, so the hunter sets as his killer rises and they never meet.",
    stars: [
      [0.7125, -0.3464],
      [0.8443, -0.4815],
      [0.92, -0.5584],
      [0.7676, -0.7598],
      [0.394, -0.7767],
      [0.1332, -0.7152],
      [0.0929, -0.4125],
      [0.0676, -0.1492],
      [-0.1444, 0.2771],
      [-0.2405, 0.4022],
      [-0.3625, 0.4611],
      [-0.6721, 0.6695],
      [-0.5963, 0.867],
      [-0.499, 0.8912],
      [-0.6941, 0.4245],
      [-0.7233, 0.2071],
    ],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 11], [11, 12], [12, 13], [11, 14], [14, 15]],
  },
  {
    id: "leo",
    // FOUNDER-REVIEW: constellation display name
    name: "Leo",
    iau: "Leo",
    // FOUNDER-REVIEW: one-line sky description
    summary: "The sickle of the lion's head, with a triangle of hindquarters.",
    // FOUNDER-REVIEW: traditional myth — real mythology only
    myth: "The Nemean lion, whose hide no weapon could pierce. Heracles strangled it with his bare hands as the first of his twelve labors, and it was raised to the heavens.",
    stars: [
      [0.5041, -0.1879],
      [0.5025, 0.0698],
      [0.92, -0.2312],
      [-0.2828, -0.363],
      [-0.2952, -0.1204],
      [-0.1442, 0.0353],
      [-0.1834, 0.2161],
      [-0.4692, 0.3471],
      [-0.5518, 0.2342],
    ],
    lines: [[0, 1], [1, 2], [0, 2], [0, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8]],
  },
  {
    id: "ursa_major",
    // FOUNDER-REVIEW: constellation display name
    name: "Ursa Major",
    iau: "UMa",
    // FOUNDER-REVIEW: one-line sky description
    summary: "The Plough — seven bright stars of the Great Bear.",
    // FOUNDER-REVIEW: traditional myth — real mythology only
    myth: "Callisto, a nymph loved by Zeus and turned into a bear by his jealous wife. Years later her own son nearly hunted her; Zeus lifted them both into the sky to keep them safe together.",
    stars: [
      [0.92, -0.4663],
      [0.6717, -0.0487],
      [0.3573, 0.0283],
      [-0.0486, 0.1081],
      [-0.2756, -0.1403],
      [-0.8223, 0.0597],
      [-0.8025, 0.4592],
    ],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [3, 6]],
  },
  {
    id: "ursa_minor",
    // FOUNDER-REVIEW: constellation display name
    name: "Ursa Minor",
    iau: "UMi",
    // FOUNDER-REVIEW: one-line sky description
    summary: "The Little Dipper, with Polaris at the end of the handle.",
    // FOUNDER-REVIEW: traditional myth — real mythology only
    myth: "Arcas, Callisto's son, set beside his mother as the Little Bear so the two would circle the pole together and never be parted.",
    stars: [
      [0.1254, -0.0539],
      [0.1696, -0.1137],
      [0.0947, -0.2287],
      [0.055, -0.1606],
      [0.2071, 0.0705],
      [0.2682, 0.204],
      [-0.92, 0.2825],
    ],
    lines: [[0, 1], [1, 2], [2, 3], [0, 3], [0, 4], [4, 5], [5, 6]],
  },
  {
    id: "andromeda",
    // FOUNDER-REVIEW: constellation display name
    name: "Andromeda",
    iau: "And",
    // FOUNDER-REVIEW: one-line sky description
    summary: "A chain of stars stretching from the Square of Pegasus.",
    // FOUNDER-REVIEW: traditional myth — real mythology only
    myth: "The princess chained to a rock as a sacrifice to a sea monster, to pay for her mother Cassiopeia's pride. Rescued by Perseus, she was placed among the stars near the family whose vanity had doomed her.",
    stars: [
      [0.5359, 0.8658],
      [-0.0756, 0.114],
      [-0.3703, -0.2409],
      [-0.7928, -0.5845],
      [-0.334, -0.453],
      [0.1168, -0.0997],
      [0.92, 0.3983],
    ],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]],
  },
  {
    id: "perseus",
    // FOUNDER-REVIEW: constellation display name
    name: "Perseus",
    iau: "Per",
    // FOUNDER-REVIEW: one-line sky description
    summary: "The hero's figure near Cassiopeia, home of Algol.",
    // FOUNDER-REVIEW: traditional myth — real mythology only
    myth: "The hero who slew Medusa and, flying home with her head, found Andromeda chained and saved her. He holds the severed head, whose winking star Algol marks the Gorgon's eye.",
    stars: [
      [-0.92, 0.4104],
      [-0.256, 0.693],
      [-0.1164, 0.5633],
      [0.077, 0.3654],
      [0.2613, 0.2529],
      [0.4091, -0.1693],
      [0.4201, -0.3984],
      [0.3723, -0.6105],
      [0.2751, -0.5885],
      [-0.0698, 0.0938],
      [-0.083, -0.118],
      [-0.1126, -0.2329],
      [-0.2571, -0.2612],
    ],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [3, 9], [9, 10], [10, 11], [11, 12]],
  },
  {
    id: "aquila",
    // FOUNDER-REVIEW: constellation display name
    name: "Aquila",
    iau: "Aql",
    // FOUNDER-REVIEW: one-line sky description
    summary: "Altair and the eagle's wings along the Milky Way.",
    // FOUNDER-REVIEW: traditional myth — real mythology only
    myth: "The eagle of Zeus, who carried his thunderbolts and bore the youth Ganymede up to Olympus. Set in the sky along the Milky Way.",
    stars: [
      [-0.6508, -0.92],
      [-0.5509, -0.8449],
      [-0.1303, -0.1434],
      [-0.5692, 0.7994],
      [-0.6957, 0.9051],
      [0.3234, 0.5143],
      [0.4223, 0.3612],
      [0.5213, 0.1453],
      [0.8707, -0.4887],
      [0.4592, -0.3284],
    ],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [3, 5], [5, 6], [6, 7], [7, 8], [8, 9], [2, 9]],
  },
  {
    id: "corona_borealis",
    // FOUNDER-REVIEW: constellation display name
    name: "Corona Borealis",
    iau: "CrB",
    // FOUNDER-REVIEW: one-line sky description
    summary: "A delicate arc — a northern crown of stars.",
    // FOUNDER-REVIEW: traditional myth — real mythology only
    myth: "The crown of Ariadne, given by Dionysus. When she died he threw it into the sky, its jewels becoming stars, so their love would be remembered.",
    stars: [
      [-0.4924, 0.6737],
      [-0.7451, 0.1663],
      [-0.4053, -0.3721],
      [-0.0063, -0.4665],
      [0.729, -0.3354],
      [0.92, 0.3341],
    ],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]],
  },
  {
    id: "gemini",
    // FOUNDER-REVIEW: constellation display name
    name: "Gemini",
    iau: "Gem",
    // FOUNDER-REVIEW: one-line sky description
    summary: "Twin bright heads, Castor and Pollux, with parallel bodies.",
    // FOUNDER-REVIEW: traditional myth — real mythology only
    myth: "Castor and Pollux, twin brothers, one mortal and one immortal. When Castor died, Pollux begged to share his immortality rather than be parted, and Zeus set them together in the sky.",
    stars: [
      [-0.3558, -0.9045],
      [-0.4964, -0.6199],
      [-0.0067, -0.281],
      [0.2904, -0.1662],
      [0.7417, 0.03],
      [0.7578, 0.3248],
      [0.559, 0.6386],
      [0.4572, 0.6302],
      [0.1238, 0.5051],
      [-0.381, 0.0896],
      [-0.77, -0.1231],
      [-0.92, -0.1236],
    ],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 11]],
  },
  {
    id: "taurus",
    // FOUNDER-REVIEW: constellation display name
    name: "Taurus",
    iau: "Tau",
    // FOUNDER-REVIEW: one-line sky description
    summary: "The V of the Hyades and long horns, Aldebaran as the eye.",
    // FOUNDER-REVIEW: traditional myth — real mythology only
    myth: "The bull, Zeus in disguise, who carried Europa across the sea. Its face is marked by the Hyades and its shoulder by the Pleiades, the seven sisters.",
    stars: [
      [-0.8049, -0.4417],
      [-0.7743, -0.4034],
      [-0.3391, -0.2535],
      [-0.091, -0.083],
      [0.0242, -0.0697],
      [0.1185, -0.035],
      [0.92, 0.2168],
      [-0.0502, 0.0211],
      [0.0236, 0.1102],
      [0.2006, 0.3155],
      [0.7726, 0.6226],
    ],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [3, 7], [7, 8], [8, 9], [9, 10]],
  },
  {
    id: "bootes",
    // FOUNDER-REVIEW: constellation display name
    name: "Boötes",
    iau: "Boo",
    // FOUNDER-REVIEW: one-line sky description
    summary: "A kite-shaped herdsman with brilliant Arcturus at his heel.",
    // FOUNDER-REVIEW: traditional myth — real mythology only
    myth: "The herdsman who drives the bears around the pole, holding the leash of the hunting dogs. Sometimes called the first ploughman, given a place in the sky for inventing the plough.",
    stars: [
      [-0.3838, -0.6204],
      [-0.1787, -0.5842],
      [-0.0206, -0.069],
      [-0.0182, 0.2964],
      [-0.1716, 0.6547],
      [-0.0855, 0.92],
      [0.2738, 0.3923],
      [0.4063, 0.0665],
      [0.108, -0.2209],
      [0.0705, -0.8354],
    ],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [3, 6], [6, 7], [7, 8], [1, 8], [1, 9]],
  },
  {
    id: "draco",
    // FOUNDER-REVIEW: constellation display name
    name: "Draco",
    iau: "Dra",
    // FOUNDER-REVIEW: one-line sky description
    summary: "A long winding dragon coiled between the bears.",
    // FOUNDER-REVIEW: traditional myth — real mythology only
    myth: "The dragon Ladon, who guarded the golden apples of the Hesperides until Heracles slew it. Hera set it in the sky, coiled forever around the pole.",
    stars: [
      [0.2054, -0.3246],
      [0.1289, -0.3031],
      [0.1343, -0.2272],
      [0.1964, -0.1822],
      [0.4272, 0.103],
      [0.5313, 0.1719],
      [0.436, 0.2535],
      [0.2768, 0.2371],
      [0.1625, 0.2216],
      [0.0657, 0.0515],
      [-0.0652, -0.0595],
      [-0.1298, -0.1375],
      [-0.2378, -0.1269],
      [-0.4731, 0.0161],
      [-0.7386, 0.1592],
      [-0.92, 0.1471],
    ],
    lines: [[0, 1], [1, 2], [2, 3], [0, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 11], [11, 12], [12, 13], [13, 14], [14, 15]],
  }
] as const;

export type MemorialConstellationId = (typeof MEMORIAL_CONSTELLATIONS)[number]["id"];

const BY_ID = new Map<string, MemorialConstellation>(
  MEMORIAL_CONSTELLATIONS.map((c) => [c.id, c])
);

export function isMemorialConstellationId(
  value: string | null | undefined
): value is MemorialConstellationId {
  if (value == null || value === "") return false;
  return BY_ID.has(value);
}

/** Resolve a stored id to its pattern, or null when unset / unknown. */
export function getMemorialConstellation(
  value: string | null | undefined
): MemorialConstellation | null {
  if (value == null || value === "") return null;
  return BY_ID.get(value) ?? null;
}

/**
 * Normalize a write candidate: null/empty/"none"/"default" → null;
 * known id → id; unknown → null (never persist invented sky).
 */
export function normalizeMemorialConstellationForWrite(
  value: string | null | undefined
): MemorialConstellationId | null {
  if (value == null || value === "" || value === "none" || value === "default") {
    return null;
  }
  return isMemorialConstellationId(value) ? value : null;
}

export interface MemorialGlyphPerson {
  is_self?: boolean;
  passed_at?: string | null;
  memorial_constellation?: string | null;
}

/**
 * True when this person should render as a memorial constellation glyph
 * instead of an ancient-light node: passed + a known assigned pattern.
 * Unassigned deceased keep ancient light (the common path).
 */
export function usesMemorialGlyph(person: MemorialGlyphPerson | null | undefined): boolean {
  if (!person || person.is_self) return false;
  if (!person.passed_at) return false;
  return getMemorialConstellation(person.memorial_constellation) != null;
}

/** FOUNDER-REVIEW: picker section label + helper copy (Remembrance space). */
export const MEMORIAL_CONSTELLATION_PICKER_COPY = {
  label: "Their constellation",
  helper:
    "Choose a real sky pattern for them on your galaxy — or leave ancient light, the common path.",
  noneLabel: "None — ancient light",
  noneHelper:
    "No assigned pattern. They stay as soft ancient light on your constellation.",
  noneMyth:
    "The light that was already theirs — quiet, still arriving, without a named figure.",
} as const;
