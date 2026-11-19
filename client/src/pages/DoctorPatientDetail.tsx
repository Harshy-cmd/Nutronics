import {
  HeartPulse,
  Activity,
  AlertTriangle,
  TrendingUp,
  FileText,
} from "lucide-react";
import { Stat } from "../components/Stat";
import { Card } from "../components/Card";
import { DISCLAIMER } from "../constants";

export function DoctorPatientDetail({ data }: { data: any }) {
  return (
    <>
      <div className="stat-grid">
        <Stat
          label="Patient"
          value={data?.patient?.name || "—"}
          note={`Age ${data?.patient?.age || "—"}`}
          icon={HeartPulse}
          tint="mint"
        />
        <Stat
          label="Conditions"
          value={(data?.patient?.conditions || []).length}
          note={(data?.patient?.conditions || []).join(", ")}
          icon={Activity}
          tint="blue"
        />
        <Stat
          label="SOS alerts"
          value={(data?.sos || []).length}
          note="Recent recorded events"
          icon={AlertTriangle}
          tint="peach"
        />
      </div>
      <Card
        title="Progress history"
        subtitle="Recent patient check-ins"
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
      </Card>
      <Card
        title="Health records"
        subtitle="Patient uploaded documents"
        icon={FileText}
      >
        {(data?.records || []).map((r: any) => (
          <div className="record-item" key={r.id}>
            <FileText />
            <div>
              <b>{r.name}</b>
              <small>
                {r.category} · {r.created_at?.slice(0, 10)}
              </small>
            </div>
          </div>
        ))}
      </Card>
      <p className="disclaimer">{DISCLAIMER}</p>
    </>
  );
}
