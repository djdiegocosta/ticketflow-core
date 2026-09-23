import { describe, expect, it } from "vitest";
import { getOperationalEvent } from "@/lib/events-queries";

const event = (id: string, eventDate: string, overrides: Record<string, unknown> = {}) =>
  ({
    id,
    event_date: eventDate,
    status: "publicado",
    is_closed: false,
    ...overrides,
  }) as any;

describe("getOperationalEvent", () => {
  const now = new Date("2026-09-22T19:00:00-03:00").getTime();

  it("never selects a closed event", () => {
    const result = getOperationalEvent([
      event("closed", "2026-09-20T23:00:00-03:00", { is_closed: true }),
    ], now);

    expect(result).toBeNull();
  });

  it("prefers the event currently in progress over future events", () => {
    const result = getOperationalEvent([
      event("future", "2026-09-25T23:00:00-03:00"),
      event("current", "2026-09-20T23:00:00-03:00"),
    ], now);

    expect(result?.id).toBe("current");
  });

  it("selects the nearest future event when none is in progress", () => {
    const result = getOperationalEvent([
      event("later", "2026-10-01T23:00:00-03:00"),
      event("next", "2026-09-24T23:00:00-03:00"),
    ], now);

    expect(result?.id).toBe("next");
  });

  it("returns null when there is no published open event", () => {
    const result = getOperationalEvent([
      event("draft", "2026-09-24T23:00:00-03:00", { status: "rascunho" }),
      event("cancelled", "2026-09-25T23:00:00-03:00", { status: "cancelado" }),
      event("closed", "2026-09-20T23:00:00-03:00", { is_closed: true }),
    ], now);

    expect(result).toBeNull();
  });
});
