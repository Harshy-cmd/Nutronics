import { Link } from "react-router-dom";
import { Users, ShieldCheck } from "lucide-react";
import { Stat } from "../components/Stat";
import { Card } from "../components/Card";

export function DoctorDashboard({ data }: { data: any }) {
  return (
    <>
      <div className="stat-grid">
        <Stat
          label="Patients in your care"
          value={data?.patients?.length || 0}
          note="Active patient accounts"
          icon={Users}
          tint="mint"
        />
        <Stat
          label="Awaiting your review"
          value={data?.queue || 0}
          note="AI answers to review"
          icon={ShieldCheck}
          tint="peach"
        />
      </div>
      <Card
        title="Your patients"
        subtitle="A snapshot of the people in your care"
        icon={Users}
      >
        <div className="table">
          <div className="table-head">
            <span>Patient</span>
            <span>Conditions</span>
            <span>Adherence</span>
            <span>Last active</span>
          </div>
          {(data?.patients || []).map((p: any) => (
            <Link
              to={`/doctor/patients/${p.id}`}
              className="table-row"
              key={p.id}
            >
              <b>{p.name}</b>
              <span>
                {p.conditions.map((c: string) => (
                  <i className="condition-tag" key={c}>
                    {c.replace("_", " ")}
                  </i>
                ))}
              </span>
              <span>{p.adherence}%</span>
              <span>{p.lastActive}</span>
            </Link>
          ))}
        </div>
      </Card>
    </>
  );
}
