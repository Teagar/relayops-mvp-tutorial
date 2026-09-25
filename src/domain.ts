import { priorities, statuses, type Activity, type RelayData, type Status, type Ticket, type TicketDraft } from "./types";

export const STORAGE_KEY = "relayops.data.v1";

export const seedData: RelayData = {
  version: 1,
  tickets: [
    ticket("ops-101", "Checkout requests timing out", "Atlas Commerce", "API", "critical", "inbox", "Unassigned", 12, "2026-09-25T12:24:00.000Z"),
    ticket("ops-102", "Webhook delivery is delayed", "Northstar Labs", "Events", "high", "progress", "Amina K.", 18, "2026-09-25T11:50:00.000Z"),
    ticket("ops-103", "Invoice PDF formatting issue", "Pioneer Studio", "Billing", "medium", "resolved", "Mateo R.", 24, "2026-09-25T10:31:00.000Z"),
    ticket("ops-104", "SSO callback loop", "Vertex Health", "Identity", "critical", "progress", "Amina K.", 9, "2026-09-25T09:42:00.000Z"),
    ticket("ops-105", "CSV export misses timezone", "Redwood Finance", "Reports", "low", "inbox", "Unassigned", 31, "2026-09-25T08:11:00.000Z"),
    ticket("ops-106", "Usage graph renders blank", "Lumen Works", "Analytics", "high", "inbox", "Mateo R.", 15, "2026-09-25T07:45:00.000Z"),
    ticket("ops-107", "Invite email delivered twice", "Beacon School", "Email", "medium", "resolved", "Amina K.", 22, "2026-09-24T20:02:00.000Z"),
    ticket("ops-108", "Mobile navigation overlap", "Field Notes", "UI", "low", "resolved", "Mateo R.", 17, "2026-09-24T18:28:00.000Z"),
  ],
  activity: [
    activity("Mateo resolved “Invoice PDF formatting issue”", "good", "2026-09-25T12:48:00.000Z"),
    activity("Amina moved “Webhook delivery is delayed” to in progress", "signal", "2026-09-25T12:35:00.000Z"),
    activity("Critical alert received from Atlas Commerce", "danger", "2026-09-25T12:24:00.000Z"),
  ],
};

export function createTicket(draft: TicketDraft, now = new Date()): Ticket {
  const title = draft.title.trim();
  const customer = draft.customer.trim();
  const tag = draft.tag.trim();
  if (!title || !customer || !tag) throw new Error("Title, customer and tag are required.");
  return { ...draft, title, customer, tag, assignee: draft.assignee.trim() || "Unassigned", id: crypto.randomUUID(), responseMinutes: 0, createdAt: now.toISOString(), updatedAt: now.toISOString() };
}

export function moveTicket(ticket: Ticket, status: Status, now = new Date()): Ticket {
  return { ...ticket, status, updatedAt: now.toISOString() };
}

export function metrics(tickets: Ticket[]) {
  const resolved = tickets.filter(({ status }) => status === "resolved").length;
  const active = tickets.filter(({ status }) => status !== "resolved");
  return {
    total: tickets.length,
    open: active.length,
    critical: active.filter(({ priority }) => priority === "critical").length,
    resolved,
    resolvedRate: tickets.length ? Math.round((resolved / tickets.length) * 100) : 0,
    avgResponse: tickets.length ? Math.round(tickets.reduce((sum, { responseMinutes }) => sum + responseMinutes, 0) / tickets.length) : 0,
  };
}

export function parseImport(input: string): RelayData {
  const value: unknown = JSON.parse(input);
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.tickets) || !Array.isArray(value.activity)) throw new Error("Unsupported RelayOps file.");
  if (!value.tickets.every(isTicket) || !value.activity.every(isActivity)) throw new Error("The file contains invalid records.");
  return value as RelayData;
}

export function filterTickets(tickets: Ticket[], query: string, priority: string, status: string) {
  const term = query.trim().toLowerCase();
  return tickets.filter((ticket) => (!term || [ticket.title, ticket.customer, ticket.tag, ticket.assignee].some((value) => value.toLowerCase().includes(term))) && (priority === "all" || ticket.priority === priority) && (status === "all" || ticket.status === status));
}

export function activity(text: string, tone: Activity["tone"], at = new Date().toISOString()): Activity { return { id: crypto.randomUUID(), text, tone, at }; }
function ticket(id: string, title: string, customer: string, tag: string, priority: Ticket["priority"], status: Status, assignee: string, responseMinutes: number, createdAt: string): Ticket { return { id, title, customer, tag, priority, status, assignee, responseMinutes, createdAt, updatedAt: createdAt }; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
function isTicket(value: unknown): value is Ticket { return isRecord(value) && typeof value.id === "string" && typeof value.title === "string" && typeof value.customer === "string" && typeof value.tag === "string" && priorities.includes(value.priority as Ticket["priority"]) && statuses.includes(value.status as Status) && typeof value.assignee === "string" && typeof value.responseMinutes === "number" && typeof value.createdAt === "string" && typeof value.updatedAt === "string"; }
function isActivity(value: unknown): value is Activity { return isRecord(value) && typeof value.id === "string" && typeof value.text === "string" && ["good", "signal", "danger"].includes(String(value.tone)) && typeof value.at === "string"; }
