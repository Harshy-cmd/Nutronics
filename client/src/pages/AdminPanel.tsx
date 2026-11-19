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
      subtitle="Control local demo services and review status"
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
        Verified {data?.verified || 0} Â· Pending {data?.pending || 0} Â·
        Rejected {data?.rejected || 0}
      </p>
    </Card>
  );
}
