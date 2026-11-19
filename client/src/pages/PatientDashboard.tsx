import { Link } from "react-router-dom";
import {
  HeartPulse,
  Clock,
  Droplets,
  TrendingUp,
  CalendarCheck,
  Check,
  ArrowRight,
  Utensils,
} from "lucide-react";
import { api } from "../api";
import { Stat } from "../components/Stat";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { QuickLinks } from "../components/QuickLinks";

export function PatientDashboard({
  data,
  refresh,
  notify,
}: {
  data: any;
  refresh: () => void;
  notify: (s: string) => void;
}) {
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
      <div className="stat-grid">
        <Stat
          label="Your care plan"
          value="On track"
          note="A steady, healthy rhythm"
          icon={HeartPulse}
          tint="mint"
        />
        <Stat
          label="Today's reminders"
          value={`${data?.reminders?.filter((r: any) => !r.done).length || 0} to go`}
          note="You've got this"
          icon={Clock}
          tint="peach"
        />
        <Stat
          label="Daily hydration"
          value={`${data?.log?.water || "—"} ml`}
          note="A sip at a time"
          icon={Droplets}
          tint="blue"
        />
      </div>
      <div className="dashboard-grid">
        <Card
          title="A little progress, every day"
          subtitle="Your recent care plan adherence"
          icon={TrendingUp}
        >
          <div className="progress-ring">
            <svg viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="41" className="ring-bg" />
              <circle
                cx="50"
                cy="50"
                r="41"
                className="ring-value"
                strokeDasharray={`${(data?.adherence || 80) * 2.58} 258`}
              />
            </svg>
            <div>
              <b>{Math.round(data?.adherence || 80)}%</b>
              <small>THIS WEEK</small>
            </div>
          </div>
          <div className="ring-caption">
            <b>Consistency is its own kind of progress.</b>
            <small>Every small choice adds up.</small>
          </div>
        </Card>
        <Card
          title="Today's gentle schedule"
          subtitle="Take things one step at a time"
          icon={CalendarCheck}
        >
          <div className="schedule">
            {(data?.reminders || []).slice(0, 4).map((r: any) => (
              <div
                className={`schedule-item ${r.done ? "done" : ""}`}
                key={r.id}
              >
                <button
                  className="check-circle"
                  aria-label={`Mark ${r.label} complete`}
                  onClick={() =>
                    submit(`/patient/reminders/${r.id}`, "PATCH", {
                      done: !r.done,
                    })
                  }
                >
                  {r.done ? <Check size={15} /> : null}
                </button>
                <div>
                  <b>{r.label}</b>
                  <small>
                    {r.kind} · {r.time}
                  </small>
                </div>
                <span className="time-tag">{r.time}</span>
              </div>
            ))}
          </div>
          <Link className="inline-link" to="/patient/reminders">
            See all reminders <ArrowRight size={15} />
          </Link>
        </Card>
      </div>
      <Card
        title="Thoughtfully planned for you"
        subtitle="Today's meals · Doctor reviewed"
        icon={Utensils}
      >
        <div className="meal-row">
          {(data?.meals || []).map((m: any) => (
            <div className="meal-card" key={m.id}>
              <span className="meal-time">{m.slot}</span>
              <b>{m.name}</b>
              <small>
                {m.calories} kcal · {m.proteinG}g protein
              </small>
              <Badge status={m.status} />
            </div>
          ))}
        </div>
      </Card>
      <QuickLinks />
    </>
  );
}
