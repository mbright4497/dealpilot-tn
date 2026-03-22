"use client";
import React, { useEffect, useState } from "react";

type Agent = "Tango" | "Marcus" | "Rayno" | "Reva" | "Carlos" | "Nina" | "Maya";

type CalendarEvent = {
  id: string;
  title: string;
  start_time: string;
  end_time?: string;
  all_day?: boolean;
  assigned_agent?: Agent;
  source?: string;
  description?: string;
};

type StatusItem = {
  agent: string;
  role: string;
  status: string;
  last_heartbeat?: string;
  current_task?: string;
};

export default function MissionControl() {
  const [tab, setTab] = useState<"office" | "calendar" | "projects">("office");
  const [calendar, setCalendar] = useState<CalendarEvent[]>([]);
  const [status, setStatus] = useState<StatusItem[]>([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({ all_day: false });
  const agents: Agent[] = ["Tango", "Marcus", "Rayno", "Reva", "Carlos", "Nina", "Maya"];

  async function loadStatus() {
    try {
      const res = await fetch("/api/mission/status");
      if (!res.ok) return;
      const data = await res.json();
      // support either data.team or data.status
      setStatus(data.team || data.status || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function loadCalendar() {
    try {
      const res = await fetch("/api/mission/calendar");
      if (!res.ok) return;
      const data = await res.json();
      setCalendar(data.events || data || []);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    loadStatus();
    if (tab === "calendar") loadCalendar();
  }, [tab]);

  function fmtTime(s?: string) {
    if (!s) return "";
    const d = new Date(s);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function relativeTime(iso?: string) {
    if (!iso) return "-";
    const then = new Date(iso).getTime();
    const now = Date.now();
    const diff = Math.round((now - then) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  function groupByDate(events: CalendarEvent[]) {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach((ev) => {
      const d = new Date(ev.start_time).toLocaleDateString();
      map[d] = map[d] || [];
      map[d].push(ev);
    });
    return map;
  }

  async function createEvent(e: React.FormEvent) {
    e.preventDefault();
    try {
      await fetch("/api/mission/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEvent),
      });
      setShowEventModal(false);
      setNewEvent({ all_day: false });
      await loadCalendar();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Mission Control</h1>
      <div className="mb-4">
        <button className={`px-3 py-1 mr-2 ${tab === "office" ? "bg-gray-200" : "bg-white"}`} onClick={() => setTab("office")}>Office</button>
        <button className={`px-3 py-1 mr-2 ${tab === "calendar" ? "bg-gray-200" : "bg-white"}`} onClick={() => setTab("calendar")}>Calendar</button>
        <button className={`px-3 py-1 ${tab === "projects" ? "bg-gray-200" : "bg-white"}`} onClick={() => setTab("projects")}>Projects</button>
      </div>

      {tab === "office" && (
        <section>
          <h2 className="text-xl mb-3">Office Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {status.map((s, idx) => (
              <div key={idx} className={`p-4 rounded shadow ${s.status === "working" ? "border-2 border-green-500" : "border"}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold">{s.agent}</div>
                    <div className="text-sm text-gray-600">{s.role}</div>
                    {s.current_task && <div className="mt-2 text-sm text-gray-800">Current: {s.current_task}</div>}
                  </div>
                  <div className="text-xs text-gray-500">{relativeTime(s.last_heartbeat)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === "calendar" && (
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl">Calendar</h2>
            <div>
              <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={() => loadCalendar()}>Refresh</button>
              <button className="ml-2 px-3 py-1 bg-blue-600 text-white rounded" onClick={() => setShowEventModal(true)}>+ New Event</button>
            </div>
          </div>

          <div>
            {calendar.length === 0 && <div className="text-gray-500">No events found.</div>}
            {Object.entries(groupByDate(calendar)).map(([date, events]) => (
              <div key={date} className="mb-4">
                <div className="font-semibold mb-2">{date}</div>
                <div className="space-y-2">
                  {events.map((ev) => (
                    <div key={ev.id} className="p-3 border rounded flex justify-between items-center">
                      <div>
                        <div className="font-medium">{ev.title}</div>
                        <div className="text-sm text-gray-600">{ev.all_day ? "All day" : `${fmtTime(ev.start_time)} — ${fmtTime(ev.end_time)}`}</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {ev.assigned_agent && <div className="px-2 py-1 text-sm bg-green-100 rounded">{ev.assigned_agent}</div>}
                        {ev.source && <div className="px-2 py-1 text-sm bg-gray-100 rounded">{ev.source}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {showEventModal && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40">
              <div className="bg-white p-6 rounded w-full max-w-md">
                <h3 className="text-lg font-semibold mb-3">New Event</h3>
                <form onSubmit={createEvent} className="space-y-3">
                  <div>
                    <label className="block text-sm">Title</label>
                    <input required className="w-full border p-2 rounded" value={newEvent.title || ""} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm">Start</label>
                    <input required type="datetime-local" className="w-full border p-2 rounded" value={newEvent.start_time || ""} onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm">End</label>
                    <input type="datetime-local" className="w-full border p-2 rounded" value={newEvent.end_time || ""} onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })} />
                  </div>
                  <div className="flex items-center space-x-3">
                    <label className="flex items-center"><input type="checkbox" checked={!!newEvent.all_day} onChange={(e) => setNewEvent({ ...newEvent, all_day: e.target.checked })} /> <span className="ml-2">All day</span></label>
                  </div>
                  <div>
                    <label className="block text-sm">Assigned Agent</label>
                    <select className="w-full border p-2 rounded" value={newEvent.assigned_agent || ""} onChange={(e) => setNewEvent({ ...newEvent, assigned_agent: e.target.value as Agent })}>
                      <option value="">-- none --</option>
                      {agents.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm">Source</label>
                    <input className="w-full border p-2 rounded" value={newEvent.source || ""} onChange={(e) => setNewEvent({ ...newEvent, source: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm">Description</label>
                    <textarea className="w-full border p-2 rounded" value={newEvent.description || ""} onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })} />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button type="button" className="px-3 py-1 border rounded" onClick={() => setShowEventModal(false)}>Cancel</button>
                    <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded">Create</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </section>
      )}

      {tab === "projects" && (
        <section>
          <h2 className="text-xl mb-3">Projects</h2>
          <div className="mb-4">
            <form>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input placeholder="Project name" className="border p-2 rounded" />
                <select className="border p-2 rounded">
                  <option value="">Owner agent (optional)</option>
                  {agents.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
                <button className="px-3 py-1 bg-blue-600 text-white rounded">Add Project</button>
              </div>
            </form>
          </div>

          <div>
            <div className="space-y-2">
              <div className="p-3 border rounded flex justify-between items-center">
                <div>
                  <div className="font-medium">Website Redesign</div>
                  <div className="text-sm text-gray-600">Status: In progress</div>
                </div>
                <div>
                  <div className="px-2 py-1 bg-purple-100 rounded text-sm">Marcus</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
