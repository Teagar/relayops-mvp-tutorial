import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { activity, createTicket, filterTickets, metrics, moveTicket, parseImport, seedData, STORAGE_KEY } from "./domain";
import { priorities, statuses, type RelayData, type Status, type Ticket, type TicketDraft } from "./types";

const blankDraft: TicketDraft = { title: "", customer: "", tag: "", priority: "medium", status: "inbox", assignee: "" };
const statusLabel: Record<Status, string> = { inbox: "Inbox", progress: "In progress", resolved: "Resolved" };

export function App() {
  const [data, setData] = useState<RelayData>(() => loadData());
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState("all");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState<Ticket | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notice, setNotice] = useState("Ready. Changes save locally.");
  const importRef = useRef<HTMLInputElement>(null);
  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(data)), [data]);

  const visible = useMemo(() => filterTickets(data.tickets, query, priority, status), [data.tickets, query, priority, status]);
  const summary = useMemo(() => metrics(data.tickets), [data.tickets]);

  function openCreate() { setEditing(null); setDialogOpen(true); }
  function openEdit(ticket: Ticket) { setEditing(ticket); setDialogOpen(true); }
  function saveTicket(draft: TicketDraft) {
    if (editing) {
      setData((current) => ({ ...current, tickets: current.tickets.map((ticket) => ticket.id === editing.id ? { ...ticket, ...draft, title: draft.title.trim(), customer: draft.customer.trim(), tag: draft.tag.trim(), assignee: draft.assignee.trim() || "Unassigned", updatedAt: new Date().toISOString() } : ticket), activity: [activity(`Updated “${draft.title.trim()}”`, "signal"), ...current.activity].slice(0, 20) }));
      setNotice(`Updated ${draft.title.trim()}.`);
    } else {
      const ticket = createTicket(draft);
      setData((current) => ({ ...current, tickets: [ticket, ...current.tickets], activity: [activity(`Created “${ticket.title}”`, ticket.priority === "critical" ? "danger" : "signal"), ...current.activity].slice(0, 20) }));
      setNotice(`Created ${ticket.title}.`);
    }
    setDialogOpen(false);
  }
  function transition(ticket: Ticket, next: Status) {
    setData((current) => ({ ...current, tickets: current.tickets.map((item) => item.id === ticket.id ? moveTicket(item, next) : item), activity: [activity(`${ticket.assignee} moved “${ticket.title}” to ${statusLabel[next]}`, next === "resolved" ? "good" : "signal"), ...current.activity].slice(0, 20) }));
    setNotice(`${ticket.title} moved to ${statusLabel[next]}.`);
  }
  function remove(ticket: Ticket) {
    if (!confirm(`Delete “${ticket.title}”? This cannot be undone.`)) return;
    setData((current) => ({ ...current, tickets: current.tickets.filter(({ id }) => id !== ticket.id), activity: [activity(`Deleted “${ticket.title}”`, "danger"), ...current.activity].slice(0, 20) }));
    setNotice(`${ticket.title} deleted.`);
  }
  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `relayops-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(link.href);
    setNotice("Backup exported.");
  }
  async function importData(file: File | undefined) {
    if (!file) return;
    try { const next = parseImport(await file.text()); setData(next); setNotice(`Imported ${next.tickets.length} tickets.`); }
    catch (error) { setNotice(error instanceof Error ? `Import failed: ${error.message}` : "Import failed."); }
    if (importRef.current) importRef.current.value = "";
  }
  function reset() { if (confirm("Restore the demonstration dataset?")) { setData(structuredClone(seedData)); setNotice("Demonstration data restored."); } }

  return <div className="app-shell">
    <a className="skip-link" href="#queue">Skip to operations queue</a>
    <header className="topbar">
      <div className="brand-mark" aria-hidden="true"><span /></div>
      <div><strong>RELAY/OPS</strong><small>Service command center · Live</small></div>
      <div className="system-state"><i /> System nominal</div>
    </header>
    <aside className="sidebar">
      <p className="eyebrow">Navigation</p>
      <nav aria-label="Primary"><a className="active" href="#queue">01 <span>Operations</span></a><a href="#activity">02 <span>Activity</span></a><a href="#data">03 <span>Data</span></a></nav>
      <div className="queue-health"><p className="eyebrow">Queue health</p><div><b>{two(summary.open)}</b><span>Open items</span></div><progress value={summary.open} max={Math.max(summary.total, 1)} /><small>Local data · Auto-saved</small></div>
      <div className="data-actions" id="data"><button onClick={exportData}>Export JSON</button><button onClick={() => importRef.current?.click()}>Import JSON</button><button className="danger-text" onClick={reset}>Reset demo</button><input ref={importRef} type="file" accept="application/json" hidden onChange={(event) => void importData(event.target.files?.[0])} /></div>
    </aside>
    <main id="queue">
      <section className="intro"><div><p className="kicker">Control desk / {new Date().toLocaleDateString("en", { month: "short", day: "2-digit" }).toUpperCase()}</p><h1>Operations queue</h1><p>Triage, assign and resolve customer incidents.</p></div><button className="primary" onClick={openCreate}>+ New ticket</button></section>
      <section className="metrics" aria-label="Operational metrics">
        <Metric label="Total" value={two(summary.total)} note="Live records" />
        <Metric label="Critical" value={two(summary.critical)} note="Action" tone="danger" />
        <Metric label="Resolved" value={two(summary.resolved)} note={`${summary.resolvedRate}% rate`} tone="good" />
        <Metric label="Avg response" value={`${summary.avgResponse}m`} note="On target" tone="signal" />
      </section>
      <section className="filters" aria-label="Filter operations">
        <label className="search"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by title, customer or tag..." aria-label="Search tickets" /></label>
        <select aria-label="Filter by priority" value={priority} onChange={(event) => setPriority(event.target.value)}><option value="all">All priorities</option>{priorities.map((value) => <option key={value} value={value}>{value}</option>)}</select>
        <select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option>{statuses.map((value) => <option key={value} value={value}>{statusLabel[value]}</option>)}</select>
      </section>
      <section className="board" aria-label="Ticket board">
        {statuses.map((column) => <section className="column" key={column}><header><h2>{statusLabel[column]}</h2><span>{visible.filter(({ status: value }) => value === column).length}</span></header><div className="card-list">
          {visible.filter(({ status: value }) => value === column).map((ticket) => <TicketCard key={ticket.id} ticket={ticket} onEdit={openEdit} onDelete={remove} onMove={transition} />)}
          {!visible.some(({ status: value }) => value === column) && <p className="empty">No matching tickets.</p>}
        </div></section>)}
      </section>
      <section className="activity" id="activity"><header><h2>Activity stream</h2><span>Last {Math.min(data.activity.length, 5)} events</span></header>{data.activity.slice(0, 5).map((event) => <div className="activity-row" key={event.id}><i data-tone={event.tone} /><span>{event.text}</span><time dateTime={event.at}>{new Date(event.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time></div>)}</section>
      <p className="sr-only" role="status" aria-live="polite">{notice}</p>
    </main>
    {dialogOpen && <TicketDialog ticket={editing} onClose={() => setDialogOpen(false)} onSave={saveTicket} />}
  </div>;
}

function Metric({ label, value, note, tone = "neutral" }: { label: string; value: string; note: string; tone?: string }) { return <article className="metric"><span>{label}</span><div><strong>{value}</strong><small data-tone={tone}>{note}</small></div></article>; }

function TicketCard({ ticket, onEdit, onDelete, onMove }: { ticket: Ticket; onEdit: (ticket: Ticket) => void; onDelete: (ticket: Ticket) => void; onMove: (ticket: Ticket, status: Status) => void }) {
  const next: Status = ticket.status === "inbox" ? "progress" : ticket.status === "progress" ? "resolved" : "inbox";
  return <article className="ticket-card" data-priority={ticket.priority}>
    <div className="ticket-top"><span className="pill" data-priority={ticket.priority}>{ticket.priority}</span><button className="icon-button" aria-label={`Edit ${ticket.title}`} onClick={() => onEdit(ticket)}>···</button></div>
    <h3>{ticket.title}</h3><p>{ticket.customer} · {ticket.tag}</p>
    <div className="ticket-meta"><span>{ticket.assignee}</span><span>{ticket.responseMinutes ? `${ticket.responseMinutes}m response` : "New"}</span></div>
    <div className="ticket-actions"><button onClick={() => onMove(ticket, next)}>{ticket.status === "resolved" ? "Reopen" : ticket.status === "progress" ? "Resolve" : "Start work"} →</button><button className="delete" onClick={() => onDelete(ticket)}>Delete</button></div>
  </article>;
}

function TicketDialog({ ticket, onClose, onSave }: { ticket: Ticket | null; onClose: () => void; onSave: (draft: TicketDraft) => void }) {
  const [draft, setDraft] = useState<TicketDraft>(ticket ? { title: ticket.title, customer: ticket.customer, tag: ticket.tag, priority: ticket.priority, status: ticket.status, assignee: ticket.assignee } : blankDraft);
  const [error, setError] = useState("");
  function submit(event: FormEvent) { event.preventDefault(); try { if (!draft.title.trim() || !draft.customer.trim() || !draft.tag.trim()) throw new Error("Complete title, customer and tag."); onSave(draft); } catch (value) { setError(value instanceof Error ? value.message : "Unable to save."); } }
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><header><div><p className="eyebrow">Ticket editor</p><h2 id="dialog-title">{ticket ? "Update incident" : "Create incident"}</h2></div><button className="icon-button" aria-label="Close dialog" onClick={onClose}>×</button></header><form onSubmit={submit}>
    <label>Title<input autoFocus value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
    <div className="form-grid"><label>Customer<input value={draft.customer} onChange={(event) => setDraft({ ...draft, customer: event.target.value })} /></label><label>Tag<input value={draft.tag} onChange={(event) => setDraft({ ...draft, tag: event.target.value })} /></label></div>
    <div className="form-grid"><label>Priority<select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as TicketDraft["priority"] })}>{priorities.map((value) => <option key={value}>{value}</option>)}</select></label><label>Status<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as Status })}>{statuses.map((value) => <option key={value} value={value}>{statusLabel[value]}</option>)}</select></label></div>
    <label>Assignee<input value={draft.assignee} onChange={(event) => setDraft({ ...draft, assignee: event.target.value })} placeholder="Unassigned" /></label>
    {error && <p className="form-error" role="alert">{error}</p>}<footer><button type="button" onClick={onClose}>Cancel</button><button className="primary" type="submit">{ticket ? "Save changes" : "Create ticket"}</button></footer>
  </form></section></div>;
}

function loadData(): RelayData { try { const stored = localStorage.getItem(STORAGE_KEY); return stored ? parseImport(stored) : structuredClone(seedData); } catch { return structuredClone(seedData); } }
function two(value: number) { return String(value).padStart(2, "0"); }
