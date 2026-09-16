# Fonts used by the family/group pattern card

Satori (the renderer behind `next/og`'s `ImageResponse`) cannot use
`next/font/google` and must not fetch Google Fonts at render time. In
sandboxed environments that fetch is blocked and the card silently renders
in a fallback serif. These files are static Latin instances of the two
families the pattern card uses, read via `fs.readFile` from this directory.

All source fonts are SIL Open Font License 1.1 (OFL.txt below):

- `Fraunces-Regular.ttf` / `Fraunces-SemiBold.ttf` — same static Latin
  instances as `app/s/[token]/opengraph-image/fonts` (pinned from
  [Fraunces](https://github.com/undercasetype/fraunces))
- `DMSans-Regular.ttf` / `DMSans-Medium.ttf` — Latin subset from
  [DM Sans](https://github.com/googlefonts/dm-fonts)

Do not replace these with a runtime `fonts.googleapis.com` URL.
