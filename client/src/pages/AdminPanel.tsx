import { Settings } from "lucide-react";
import { api } from "../api";
import { Card } from "../components/Card";

export function AdminPanel({
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
    <Card
      title="System & AI configuration"
      subtitle="Validated system settings and recent administrator activity"
      icon={Settings}
    >
      <div className="config-options">
        {Object.entries(data?.config || {}).map(([key, value]: any) => (
          <label className="config-row" key={key}>
            <span>
              <b>{key}</b>
              <small>Platform setting</small>
            </span>
            <input defaultValue={value} id={`cfg-${key}`} />
          </label>
        ))}
      </div>
      <button
        className="button primary"
        onClick={() => {
          const config: any = {};
          Object.keys(data?.config || {}).forEach(
            (k) =>
              (config[k] = (
                document.getElementById(`cfg-${k}`) as HTMLInputElement
              ).value),
          );
          submit("/admin/config", "PUT", config);
        }}
      >
        Save configuration
      </button>
      <p>
        Verified {data?.verified || 0} · Pending {data?.pending || 0} ·
        Rejected {data?.rejected || 0}
      </p>
      <h3>Recent admin activity</h3>
      <div className="record-list">
        {(data?.audit || []).map((event: any) => <div className="record-item" key={event.id}>
          <div><b>{event.action.replaceAll("_", " ")}</b><small>{event.actor_name || "Former account"} · {event.entity_type}{event.entity_id ? ` ${event.entity_id}` : ""} · {new Date(event.created_at).toLocaleString()}</small></div>
        </div>)}
        {!data?.audit?.length && <small>No administrator activity recorded yet.</small>}
      </div>
      <h3>Pending account deletion requests</h3>
      <div className="record-list">
        {(data?.deletionRequests || []).map((request: any) => <div className="record-item" key={request.id}><div><b>{request.name} · {request.email}</b><small>Requested {new Date(request.created_at).toLocaleString()}. Verify identity and complete the deletion workflow.</small></div></div>)}
        {!data?.deletionRequests?.length && <small>No pending deletion requests.</small>}
      </div>
    </Card>
  );
}
