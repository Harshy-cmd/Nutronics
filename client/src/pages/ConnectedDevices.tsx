import { Watch } from "lucide-react";
import { api } from "../api";
import { Card } from "../components/Card";
import { DISCLAIMER } from "../constants";

export function ConnectedDevices({
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
      title="Devices that keep you connected"
      subtitle="Simulated device pairing for this demo"
      icon={Watch}
    >
      <div className="device-list">
        {(data?.devices || []).map((d: any) => (
          <div className="device-item" key={d.id}>
            <span className="device-icon">
              <Watch />
            </span>
            <div>
              <b>{d.name}</b>
              <small>
                {d.paired ? "Connected and ready" : "Available to pair"}
              </small>
            </div>
            {d.paired && (
              <button
                className="button outline"
                onClick={async () => {
                  const r = await api(`/patient/devices/${d.id}/sync`, {
                    method: "POST",
                    body: "{}",
                  });
                  await submit("/patient/progress", "POST", r.reading);
                }}
              >
                Sync reading
              </button>
            )}
            <button
              className={`button small ${d.paired ? "subtle" : "primary"}`}
              onClick={async () => {
                await submit(`/patient/devices/${d.id}`, "PATCH", {
                  paired: !d.paired,
                });
              }}
            >
              {d.paired ? "Unpair" : "Pair"}
            </button>
          </div>
        ))}
      </div>
      <p className="disclaimer">
        Device readings are synthetic in this demo. {DISCLAIMER}
      </p>
    </Card>
  );
}
