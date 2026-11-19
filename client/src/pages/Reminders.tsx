import { useState } from "react";
import { Plus, Droplets, Utensils, Clock } from "lucide-react";
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

  const submit = async (path: string, method = "POST", body: any = {}) => {
    try {
      await api(path, { method, body: JSON.stringify(body) });
      notify("Saved successfully");
      refresh();
    } catch (e) {
      notify((e as Error).message);
    }
  };

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
          onClick={() => {
            const label = prompt("Reminder name");
            if (label)
              submit("/patient/reminders", "POST", {
                label,
                kind: "Medicine",
                time: "12:00",
              });
          }}
        >
          <Plus size={16} /> Add reminder
        </button>
      </div>
      <div className="reminder-list">
        {(data?.reminders || [])
          .filter((r: any) => filter === "ALL" || r.kind === filter)
          .map((r: any) => (
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
            </div>
          ))}
      </div>
    </>
  );
}
