export const statuses = ["inbox", "progress", "resolved"] as const;
export const priorities = ["critical", "high", "medium", "low"] as const;
export type Status = typeof statuses[number];
export type Priority = typeof priorities[number];

export type Ticket = {
  id: string;
  title: string;
  customer: string;
  tag: string;
  priority: Priority;
  status: Status;
  assignee: string;
  responseMinutes: number;
  createdAt: string;
  updatedAt: string;
};

export type Activity = { id: string; text: string; tone: "good" | "signal" | "danger"; at: string };
export type RelayData = { version: 1; tickets: Ticket[]; activity: Activity[] };
export type TicketDraft = Pick<Ticket, "title" | "customer" | "tag" | "priority" | "status" | "assignee">;
