## Signed-in free chart stays in the product (branch `cursor/signed-in-chart-tool-faf4`) — 2026-09-14

**Trigger**: A signed-in viewer who opened `/chart` left the app shell, saw signup and "save to your galaxy" funnel copy, and after saving was left on the chart instead of the person they just added.

`[DECISION]` **One session-aware `/chart` route, not `/app/chart`.** Two routes would duplicate the form and split the SEO value of a page that ranks. The server page does not read cookies, so crawlers still get the static logged-out HTML with the same metadata, canonical, and WebPage JSON-LD.

`[CHANGED]` **Signed-in chrome uses the app nav (Home, Compare, Groups, Vela, Settings, Free chart) instead of the marketing header and signup footer.** Logged-out `/chart` is unchanged: Log in pill, "Sign up to build your galaxy" footer, "Save to your galaxy" CTA into `/signup?next=/welcome?prefill=…`.

`[CHANGED]` **Signed-in save adds the already-entered person to the constellation and opens `/app/person/[id]`.** FOUNDER-REVIEW copy: "Add this person to your constellation" / "Add {name} to your constellation", confirm "Add to constellation", success "✦ {name} is in your constellation." Quick Compare still stays on the result (`navigateToProfileOnSave={false}`) with a profile link. Chart computation is unchanged.
