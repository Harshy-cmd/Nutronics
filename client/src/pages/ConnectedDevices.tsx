import { useState } from "react";
import { Watch, Plus } from "lucide-react";
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
  const [adding, setAdding] = useState(false);

  const submit = async (path: string, method = "POST", body: any = {}) => {
    try {
      await api(path, { method, body: JSON.stringify(body) });
      notify("Saved successfully");
      refresh();
    } catch (e) {
      notify((e as Error).message);
    }
  };

  const handleAddDevice = async () => {
    setAdding(true);
    try {
      await submit("/patient/devices", "POST", { name: "Continuous Glucose Monitor" });
    } finally {
      setAdding(false);
    }
  };

  const devices = data?.devices || [];

  return (
    <Card
      title="Devices that keep you connected"
      subtitle="Simulated device pairing for this demo"
      icon={Watch}
    >
      <div className="device-list">
        {devices.length > 0 ? (
          devices.map((d: any) => (
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
          ))
        ) : (
          <div className="empty-state-card">
            <Watch size={32} style={{ color: "var(--teal)", opacity: 0.7 }} />
            <b>No devices paired</b>
            <p>Connect simulated health hardware to sync daily vitals.</p>
          </div>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <button
          className="button outline"
          onClick={handleAddDevice}
          disabled={adding}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <Plus size={16} /> {adding ? "Adding…" : "Add simulated device"}
        </button>
      </div>

      <p className="disclaimer">
        Device readings are synthetic in this demo. {DISCLAIMER}
      </p>
    </Card>
  );
}
