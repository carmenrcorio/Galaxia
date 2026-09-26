/**
 * Web re-export of the shared glossary. Term data lives in
 * `@galaxia/core` so web and mobile resolve the same slugs.
 * Title / description / lede stay here so public-page metadata
 * tests keep reading this file.
 */

export {
  ASPECT_GLOSSARY_SLUGS,
  GLOSSARY_SEE_FULL_DEFINITION,
  GLOSSARY_TERMS,
  aspectGlossarySlug,
  getGlossaryTerm,
  glossaryPreview,
  groupGlossaryByLetter,
  type AspectGlossarySlug,
  type GlossaryLetterGroup,
  type GlossaryReadMore,
  type GlossaryTerm,
} from "@galaxia/core";

export const GLOSSARY_TITLE = "Astrology terms, plainly defined";
export const GLOSSARY_DESCRIPTION =
  "Plain-English definitions of natal charts, synastry, aspects, and houses. What each term is, and why it matters for understanding a person.";
export const GLOSSARY_LEDE =
  "The words Galaxia uses to describe how a person is built. Not a horoscope. Not a prediction. A shared vocabulary for natal charts, synastry, and the contacts between them.";
