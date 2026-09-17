import { describe, expect, it } from "vitest";
import { campaignStatusPillInfo, compPillInfo, emailEnabledPillInfo, statusPillInfo } from "./status-pill";

describe("statusPillInfo", () => {
  it("maps active and lifetime to success", () => {
    expect(statusPillInfo("active")).toEqual({ label: "Active", variant: "success" });
    expect(statusPillInfo("lifetime")).toEqual({ label: "Lifetime", variant: "success" });
  });

  it("maps trialing to warning", () => {
    expect(statusPillInfo("trialing")).toEqual({ label: "Trialing", variant: "warning" });
  });

  it("maps canceled and past_due to danger", () => {
    expect(statusPillInfo("canceled")).toEqual({ label: "Canceled", variant: "danger" });
    expect(statusPillInfo("past_due")).toEqual({ label: "Past due", variant: "danger" });
  });

  it("maps null/undefined/unrecognized to muted, never guessing a color", () => {
    expect(statusPillInfo(null)).toEqual({ label: "Unknown", variant: "muted" });
    expect(statusPillInfo(undefined)).toEqual({ label: "Unknown", variant: "muted" });
    expect(statusPillInfo("some_future_status")).toEqual({ label: "some_future_status", variant: "muted" });
  });
});

describe("compPillInfo", () => {
  it("maps true to an accent Yes pill", () => {
    expect(compPillInfo(true)).toEqual({ label: "Yes", variant: "accent" });
  });

  it("maps false to a muted No pill", () => {
    expect(compPillInfo(false)).toEqual({ label: "No", variant: "muted" });
  });
});

describe("emailEnabledPillInfo / campaignStatusPillInfo", () => {
  it("maps campaign and email pause states", () => {
    expect(campaignStatusPillInfo("draft")).toEqual({ label: "Draft", variant: "warning" });
    expect(campaignStatusPillInfo("sent")).toEqual({ label: "Sent", variant: "success" });
    expect(campaignStatusPillInfo("failed")).toEqual({ label: "Failed", variant: "danger" });
    expect(emailEnabledPillInfo(true)).toEqual({ label: "Sending", variant: "success" });
    expect(emailEnabledPillInfo(false)).toEqual({ label: "Paused", variant: "warning" });
  });
});
