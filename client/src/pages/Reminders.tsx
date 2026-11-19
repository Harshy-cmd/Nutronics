import { useState } from "react";
import { Plus, Droplets, Utensils, Clock, Trash2, X, Check } from "lucide-react";
import { api } from "../api";

export function Reminders({
  data,
  refresh,
  notify,
}: {
  data: any;
  refresh: () => void;
  notify: (s: string) => void;
}) {
  const [filter, setFilter] = useState("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<"Medicine" | "Water" | "Meal">("Medicine");
  const [time, setTime] = useState("09:00");
  const [saving, setSaving] = useState(false);

  const submit = async (path: string, method = "POST", body: any = {}) => {
    try {
      await api(path, { method, body: JSON.stringify(body) });
      notify("Saved successfully");
      refresh();
    } catch (e) {
      notify((e as Error).message);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    setSaving(true);
    try {
      await submit("/patient/reminders", "POST", {
        label: label.trim(),
        kind,
        time,
      });
      setLabel("");
      setTime("09:00");
      setShowAddModal(false);
    } finally {
      setSaving(false);
    }
  };

  const reminders = (data?.reminders || []).filter(
    (r: any) => filter === "ALL" || r.kind === filter
  );

  return (
    <>
      <div className="toolbar">
        <div className="filter-pills">
          {["ALL", "Medicine", "Water", "Meal"].map((x) => (
            <button
              className={filter === x ? "selected" : ""}
              key={x}
              onClick={() => setFilter(x)}
            >
              {x === "ALL" ? "All reminders" : x}
            </button>
          ))}
        </div>
        <button
          className="button primary"
          onClick={() => setShowAddModal(true)}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <Plus size={16} /> Add reminder
        </button>
      </div>

      <div className="reminder-list">
        {reminders.length > 0 ? (
          reminders.map((r: any) => (
            <div className="reminder-item" key={r.id}>
              <span className={`reminder-icon ${r.kind.toLowerCase()}`}>
                {r.kind === "Water" ? (
                  <Droplets />
                ) : r.kind === "Meal" ? (
                  <Utensils />
                ) : (
                  <Clock />
                )}
              </span>
              <div className="reminder-text">
                <b>{r.label}</b>
                <small>{r.kind} reminder</small>
              </div>
              <span className="time-tag">{r.time}</span>
              <button
                className="button small subtle"
                onClick={() =>
                  submit(`/patient/reminders/${r.id}`, "PATCH", {
                    snooze: true,
                  })
                }
              >
                Snooze 15m
              </button>
              <button
                className={`button small ${r.done ? "subtle" : "outline"}`}
                onClick={() =>
                  submit(`/patient/reminders/${r.id}`, "PATCH", {
                    done: !r.done,
                  })
                }
              >
                {r.done ? "Done" : "Mark done"}
              </button>
              <button
                className="action-icon-btn"
                onClick={() => submit(`/patient/reminders/${r.id}`, "DELETE")}
                aria-label={`Delete ${r.label}`}
                title="Delete reminder"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        ) : (
          <div
            className="empty-state-card"
            style={{
              background: "#fff",
              borderRadius: 14,
              border: "1px solid var(--line)",
            }}
          >
            <Clock size={32} style={{ color: "var(--teal)", opacity: 0.7 }} />
            <b>No reminders in this view</b>
            <p>
              Stay on track by scheduling medication, hydration, and meal
              reminders.
            </p>
            <button
              className="button small primary"
              onClick={() => setShowAddModal(true)}
              style={{
                marginTop: 6,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Plus size={14} /> Add your first reminder
            </button>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="modal-back">
          <div className="modal">
            <button
              className="close"
              onClick={() => setShowAddModal(false)}
              aria-label="Close"
            >
              <X />
            </button>
            <div className="eyebrow">NEW REMINDER</div>
            <h2>Schedule a reminder</h2>
            <form onSubmit={handleCreate} className="modal-form">
              <label>
                Reminder title
                <input
                  required
                  placeholder="e.g. Morning Metformin, Drink 500ml water"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  autoFocus
                />
              </label>

              <label>
                Category
                <select
                  value={kind}
                  onChange={(e) =>
                    setKind(e.target.value as "Medicine" | "Water" | "Meal")
                  }
                >
                  <option value="Medicine">Medicine</option>
                  <option value="Water">Water</option>
                  <option value="Meal">Meal</option>
                </select>
              </label>

              <label>
                Time
                <input
                  type="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="button subtle"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button primary"
                  disabled={saving || !label.trim()}
                >
                  <Check size={16} />{" "}
                  {saving ? "Scheduling…" : "Save reminder"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
