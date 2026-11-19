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
    <Card
      title="People on Nutronics"
      subtitle="Manage access to the platform"
      icon={Users}
    >
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
              (!search || u.name.toLowerCase().includes(search.toLowerCase())),
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
            </div>
          ))}
      </div>
    </Card>
  );
}
