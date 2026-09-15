// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdoptionMetricsDashboard } from "./adoption-metrics-dashboard";
import type { AdminAdoptionMetrics } from "../../lib/admin/adoption-metrics";

const METRICS: AdminAdoptionMetrics = {
  total_accounts: 18,
  new_accounts_this_week: 3,
  active_accounts_this_week: 5,
  accounts_with_person: 10,
  total_people: 46,
  people_added_this_week: 5,
  avg_people_per_account: 4.6,
  memorial_or_ancient_profiles: 6,
  total_vela_conversations: 32,
  vela_messages_this_week: 3,
  compare_sessions: 0,
  compare_sessions_this_week: 0,
  total_groups: 2,
  groups_with_3_plus_members: 2,
  moments_logged: 0,
  connect_invites_sent: 2,
  connect_invites_accepted: 0,
  blog_email_captures: 0
};

describe("AdoptionMetricsDashboard", () => {
  it("renders all five sections, the cumulative counts, and gold this-week deltas", () => {
    render(<AdoptionMetricsDashboard metrics={METRICS} />);

    expect(screen.getByRole("heading", { name: "Accounts" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Constellation" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Vela and Compare" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Groups" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Engagement" })).toBeTruthy();

    expect(screen.getByText("Total accounts")).toBeTruthy();
    expect(screen.getByText("18")).toBeTruthy();
    expect(screen.getByText("+3 this week")).toBeTruthy();
    expect(screen.getByText("4.60")).toBeTruthy();
    expect(screen.getByText("Memorial / ancient profiles")).toBeTruthy();
    expect(screen.getByText("Blog email captures")).toBeTruthy();
  });
});
