## Person profile group nav: opaque sticky chrome and scroll-margin (branch `cursor/person-group-nav-polish-0bfa`) — 2026-09-14

**Trigger**: After regrouping the person profile, wrapped jump chips on a 375px phone let the previous section show through the sticky rail, and inline `scrollMarginTop: 92` beat the taller CSS margin.

`[FIXED]` **Sticky group nav is opaque, and in-panel section anchors use a taller scroll-margin.** Wrapped jump chips stay readable; the section you jump to clears the chrome. `PersonProfileNav` has a living vs memorial component test. Follow-up to #250.
