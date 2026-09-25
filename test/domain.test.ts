import { describe, expect, it, vi } from "vitest";
import { createTicket, filterTickets, metrics, moveTicket, parseImport, seedData } from "../src/domain";

describe("RelayOps domain", () => {
  it("derives operational metrics from tickets", () => {
    expect(metrics(seedData.tickets)).toEqual({ total: 8, open: 5, critical: 2, resolved: 3, resolvedRate: 38, avgResponse: 19 });
  });

  it("creates normalized tickets and moves them without mutation", () => {
    vi.stubGlobal("crypto", { randomUUID: () => "new-id" });
    const created = createTicket({ title: "  Payment failed ", customer: " Acme ", tag: " API ", priority: "high", status: "inbox", assignee: "" }, new Date("2026-01-01T00:00:00Z"));
    expect(created).toMatchObject({ id: "new-id", title: "Payment failed", customer: "Acme", tag: "API", assignee: "Unassigned" });
    const moved = moveTicket(created, "resolved", new Date("2026-01-02T00:00:00Z"));
    expect(moved.status).toBe("resolved");
    expect(created.status).toBe("inbox");
  });

  it("filters across searchable fields and facets", () => {
    expect(filterTickets(seedData.tickets, "atlas", "all", "all")).toHaveLength(1);
    expect(filterTickets(seedData.tickets, "", "critical", "progress")).toHaveLength(1);
  });

  it("round-trips exports and rejects malformed imports", () => {
    expect(parseImport(JSON.stringify(seedData))).toEqual(seedData);
    expect(() => parseImport('{"version":1,"tickets":[{}],"activity":[]}')).toThrow("invalid records");
    expect(() => parseImport('{"version":2,"tickets":[],"activity":[]}')).toThrow("Unsupported");
  });
});
