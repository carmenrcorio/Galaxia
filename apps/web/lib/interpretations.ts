type BodyKey = "sun"|"moon"|"mercury"|"venus"|"mars"|"jupiter"|"saturn"|"uranus"|"neptune"|"pluto";
const BODY_LABEL: Record<BodyKey, string> = { sun:"Core identity", moon:"Emotional world", mercury:"Mind & voice", venus:"How they love", mars:"Drive & desire", jupiter:"Where they expand", saturn:"Where they discipline", uranus:"Where they break rules", neptune:"Where they dream", pluto:"Where they transform" };
const SIGN_LINE: Record<string, string> = { Aries:"direct, fast, leading with instinct", Taurus:"steady, sensory, building slowly", Gemini:"curious, adaptable, always in dialogue", Cancer:"tender, intuitive, protecting what they love", Leo:"warm, expressive, needing to be seen", Virgo:"careful, devoted to doing things right", Libra:"harmonising, beauty-seeking, weighing everything", Scorpio:"intense, private, all-or-nothing in depth", Sagittarius:"expansive, truth-chasing, free in spirit", Capricorn:"ambitious, structured, playing a long game", Aquarius:"original, collective-minded, ahead of the crowd", Pisces:"absorbent, compassionate, permeable to the unseen" };

export function interpretPlacement(body: string, sign: string): string {
  const label = BODY_LABEL[body as BodyKey];
  const line  = SIGN_LINE[sign];
  if (!label || !line) return "";
  return `${label} · ${line}`;
}

export function interpretBigThree(placement: "sun"|"moon"|"rising", sign: string): string {
  const s = SIGN_LINE[sign] ?? "";
  if (placement === "sun")    return `They shine through being ${s}`;
  if (placement === "moon")   return `Emotionally they are ${s}`;
  return `They come across as ${s}`;
}
