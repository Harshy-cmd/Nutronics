import { useState } from "react";
import { TrendingUp, Plus } from "lucide-react";
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
      <Card
        title="Your wellbeing, over time"
        subtitle="A gentle look at the trends you're building"
        icon={TrendingUp}
      >
        <div className="chart">
          {(data?.logs || []).slice(-14).map((l: any, i: number) => (
            <div className="chart-col" key={i}>
              <span style={{ height: `${(l.adherence || 10) * 1.5}px` }} />
              <small>{l.date?.slice(5)}</small>
            </div>
          ))}
        </div>
        <div className="chart-legend">
          <i /> Care plan adherence
        </div>
      </Card>
      <Card
        title="Add today's check-in"
        subtitle="A few numbers help you notice patterns"
        icon={Plus}
      >
        <div className="form-grid">
          {[
            ["weight", "Weight (kg)"],
            ["water", "Water (ml)"],
            ["calories", "Calories"],
            ["systolic", "Systolic BP"],
            ["diastolic", "Diastolic BP"],
            ["glucose", "Fasting glucose"],
          ].map(([k, l]) => (
            <label key={k}>
              {l}
              <input
                type="number"
                onChange={(e) =>
                  setForm({ ...form, [k]: Number(e.target.value) })
                }
              />
            </label>
          ))}
          <label className="wide">
            Symptoms or notes
            <input
              placeholder="How are you feeling today?"
              onChange={(e) => setForm({ ...form, symptoms: e.target.value })}
            />
          </label>
        </div>
        <button
          className="button primary"
          onClick={() => submit("/patient/progress", "POST", form)}
        >
          Save check-in
        </button>
      </Card>
    </>
  );
}
