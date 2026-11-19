import {
  Users,
  Stethoscope,
  AlertTriangle,
  ShieldCheck,
  Activity,
} from "lucide-react";
import { Stat } from "../components/Stat";
import { Card } from "../components/Card";

export function AdminDashboard({ data }: { data: any }) {
  return (
    <>
      <div className="stat-grid">
        <Stat
          label="Active patients"
          value={data?.activePatients || 0}
          note="Patient accounts"
          icon={Users}
          tint="mint"
          to="/admin/users"
        />
        <Stat
          label="Care team"
          value={data?.activeDoctors || 0}
          note="Active doctors"
          icon={Stethoscope}
          tint="blue"
          to="/admin/users"
        />
        <Stat
          label="SOS this week"
          value={data?.sosThisWeek || 0}
          note="Recorded alerts"
          icon={AlertTriangle}
          tint="peach"
        />
        <Stat
          label="Verified answers"
          value={`${data?.verificationRate || 0}%`}
          note="AI guidance reviewed"
          icon={ShieldCheck}
          tint="mint"
        />
      </div>
      <Card
        title="Care activity"
        subtitle="Average adherence across recent logs"
        icon={Activity}
      >
        <div className="chart">
          {(data?.logs || [])
            .slice(0, 10)
            .reverse()
            .map((l: any, i: number) => (
              <div className="chart-col" key={i}>
                <span style={{ height: `${(l.adherence || 10) * 1.5}px` }} />
                <small>{l.date?.slice(5)}</small>
              </div>
            ))}
        </div>
      </Card>
    </>
  );
}
