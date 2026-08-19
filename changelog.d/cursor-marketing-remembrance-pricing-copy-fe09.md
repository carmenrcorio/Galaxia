## Remembrance section + pricing headline (branch `cursor/marketing-remembrance-pricing-copy-fe09`) — 2026-08-19

**Trigger**: Founder-authored copy for two marketing surfaces: a new landing section naming Remembrance directly (deceased people stay fully readable in Compare; the existing honor-constellation and ancient-light passed state), and a pricing headline/lede rewrite. Both map to shipped features; no new claim was added.

`[ADDED]` **`RemembranceSection`** (`apps/web/components/marketing/remembrance-section.tsx`). Inserted between `WhySection` ("The shift") and `WhyNotSection` on the landing page (`apps/web/app/page.tsx`). Reuses the `WhySection` markup pattern exactly (`section.shift.container` + `.eyebrow` + `h2` + `.body`), so it inherits that section's mobile behavior with zero new CSS. Copy is founder-authored verbatim; tagged `FOUNDER-REVIEW: authored`.

`[CHANGED]` **Pricing headline + lede** (`apps/web/components/marketing/pricing-section.tsx`). "One price. Everyone you love." → "One honest plan."; the tiers/add-ons/limit lede → "No feature tiers. No per-person fees. No upsells." The Yearly/Monthly cards and the existing "No per-person cap" grandmother line are unchanged. Founder-authored verbatim; tagged `FOUNDER-REVIEW: authored`.
