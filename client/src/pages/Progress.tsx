import { useState } from "react";
import { TrendingUp, Plus, Check } from "lucide-react";
import { api } from "../api";
import { Card } from "../components/Card";

export function Progress({
  data,
  refresh,
  notify,
}: {
  data: any;
  refresh: () => void;
  notify: (s: string) => void;
}) {
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const submit = async (path: string, method = "POST", body: any = {}) => {
    setSaving(true);
    try {
      await api(path, { method, body: JSON.stringify(body) });
      notify("Check-in saved successfully!");
      refresh();
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const logs = data?.logs || [];
  const latestLog = logs[logs.length - 1];

  return (
    <>
      <Card
        title="Your wellbeing, over time"
        subtitle="A gentle look at the trends you're building"
        icon={TrendingUp}
      >
        {logs.length > 0 ? (
          <>
            <div className="chart">
              {logs.slice(-14).map((l: any, i: number) => (
                <div className="chart-col" key={i}>
                  <span style={{ height: `${Math.max(12, (l.adherence || 10) * 1.5)}px` }} />
                  <small>{l.date?.slice(5)}</small>
                </div>
              ))}
            </div>
            <div className="chart-legend">
              <i /> Care plan adherence
            </div>
          </>
        ) : (
          <div className="empty-state-card" style={{ padding: "40px 16px" }}>
            <TrendingUp size={36} style={{ color: "var(--teal)", opacity: 0.7 }} />
            <b>No progress logs yet</b>
            <p>Log your daily metrics below to see your adherence trends and vitals over time.</p>
          </div>
        )}
      </Card>

      <Card
        title="Add today's check-in"
        subtitle="A few numbers help you notice patterns"
        icon={Plus}
      >
        <div className="form-grid">
          {[
            ["weight", "Weight (kg)", latestLog?.weight],
            ["water", "Water (ml)", latestLog?.water],
            ["calories", "Calories", latestLog?.calories],
            ["systolic", "Systolic BP", latestLog?.systolic],
            ["diastolic", "Diastolic BP", latestLog?.diastolic],
            ["glucose", "Fasting glucose", latestLog?.glucose],
          ].map(([k, l, def]) => (
            <label key={k as string}>
              {l as string}
              <input
                type="number"
                placeholder={def ? String(def) : "Enter value"}
                defaultValue={form[k as string] ?? def ?? ""}
                onChange={(e) =>
                  setForm({ ...form, [k as string]: Number(e.target.value) })
                }
              />
            </label>
          ))}
          <label className="wide">
            Symptoms or notes
            <input
              placeholder="How are you feeling today?"
              defaultValue={latestLog?.symptoms || ""}
              onChange={(e) => setForm({ ...form, symptoms: e.target.value })}
            />
          </label>
        </div>
        <button
          className="button primary"
          onClick={() => submit("/patient/progress", "POST", form)}
          disabled={saving}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <Check size={16} /> {saving ? "Saving…" : "Save check-in"}
        </button>
      </Card>
    </>
  );
}
