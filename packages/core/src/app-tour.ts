/**
 * Cross-platform eligibility for the three-step app-home tour.
 *
 * The first-run orientation and the app tour are deliberately separate:
 * orientation creates the first records, while this tour explains the
 * resulting home surface. A reader must settle orientation before the tour
 * can appear, and either completing or skipping the tour settles it forever.
 */
export interface AppTourProfileRow {
  onboarding_completed_at?: string | null;
  app_tour_seen_at?: string | null;
}

// FOUNDER-REVIEW: all app-tour copy shared by web and mobile.
export const APP_TOUR_COPY = {
  steps: [
    {
      title: "Add someone you know",
      body:
        "Start by adding someone in your life. A partner, a parent, a friend, a coworker. You only need their birthday.",
      secondary:
        "You can add people who have passed, too. They stay in your sky.",
    },
    {
      title: "See their chart",
      body:
        "Every person gets a full natal chart. See how they are built, not just their sun sign.",
    },
    {
      title: "Compare your charts",
      body:
        "This is where it gets real. Compare any two people to see what flows, what catches, and what they need from each other.",
    },
  ],
  skip: "Skip",
  next: "Next",
  finish: "Get started",
  saveError: "The tour could not be saved. Try again.",
} as const;

export function shouldShowAppTour(
  profile: AppTourProfileRow | null | undefined
): boolean {
  return Boolean(profile?.onboarding_completed_at) && !profile?.app_tour_seen_at;
}
