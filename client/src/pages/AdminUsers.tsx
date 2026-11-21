import { useState } from "react";
import { Users } from "lucide-react";
import { api } from "../api";
import { Card } from "../components/Card";

export function AdminUsers({
  data,
  refresh,
  notify,
}: {
  data: any;
  refresh: () => void;
  notify: (s: string) => void;
}) {
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffRole, setStaffRole] = useState("DOCTOR");

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
    <Card title="Provision staff account" subtitle="The staff member signs in with the exact provisioned email using the configured Firebase link or Google sign-in." icon={Users}>
      <div className="form-grid">
        <label>Staff name<input value={staffName} onChange={e => setStaffName(e.target.value)} /></label>
        <label>Work email<input type="email" value={staffEmail} onChange={e => setStaffEmail(e.target.value)} /></label>
        <label>Portal role<select value={staffRole} onChange={e => setStaffRole(e.target.value)}><option value="DOCTOR">Doctor</option><option value="ADMIN">Administrator</option></select></label>
      </div>
      <button className="button primary" disabled={!staffName.trim() || !staffEmail.trim()} onClick={async () => { await submit("/admin/users", "POST", { name: staffName.trim(), email: staffEmail.trim(), role: staffRole }); setStaffName(""); setStaffEmail(""); }}>Provision staff</button>
    </Card>
    <Card title="People on Nutronics" subtitle="Manage account access and assign patients to doctors" icon={Users}>
      <div className="toolbar">
        <input
          placeholder="Search people"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="filter-pills">
          {["ALL", "PATIENT", "DOCTOR", "ADMIN"].map((x) => (
            <button
              className={filter === x ? "selected" : ""}
              key={x}
              onClick={() => setFilter(x)}
            >
              {x}
            </button>
          ))}
        </div>
      </div>
      <div className="table">
        {(data?.users || [])
          .filter(
            (u: any) =>
              (filter === "ALL" || u.role === filter) &&
              (!search || `${u.name} ${u.email}`.toLowerCase().includes(search.toLowerCase())),
          )
          .map((u: any) => (
            <div className="table-row" key={u.id}>
              <b>{u.name}</b>
              <span>{u.email}</span>
              <span>{u.role}</span>
              <button
                className="button small outline"
                onClick={() =>
                  submit(`/admin/users/${u.id}`, "PATCH", {
                    active: !u.active,
                  })
                }
              >
                {u.active ? "Deactivate" : "Activate"}
              </button>
              {u.role === "PATIENT" && (
                <div className="wide" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                  <b>Assigned doctors</b>
                  {(data?.doctors || []).map((doctor: any) => {
                    const assigned = (data?.assignments || []).some((a: any) => a.patient_id === u.id && a.doctor_id === doctor.id);
                    return <label key={doctor.id} style={{ display: "inline-flex", gap: 5, alignItems: "center", fontSize: 12 }}>
                      <input type="checkbox" checked={assigned} onChange={(event) => {
                        const activeDoctorIds = new Set((data?.doctors || []).map((d: any) => d.id));
                        const ids = new Set((data?.assignments || []).filter((a: any) => a.patient_id === u.id && activeDoctorIds.has(a.doctor_id)).map((a: any) => a.doctor_id));
                        if (event.target.checked) ids.add(doctor.id); else ids.delete(doctor.id);
                        submit(`/admin/assignments/${u.id}`, "PUT", { doctorIds: [...ids] });
                      }} /> {doctor.name}
                    </label>;
                  })}
                </div>
              )}
            </div>
          ))}
      </div>
    </Card>
    </>
  );
}
