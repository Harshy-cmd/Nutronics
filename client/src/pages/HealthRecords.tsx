import { FileText, Plus, Download, Trash2 } from "lucide-react";
import { api } from "../api";
import { Card } from "../components/Card";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export function HealthRecords({
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

  const handleDownload = async (r: any) => {
    try {
      const token = localStorage.getItem("nutronics_token");
      const res = await fetch(`${API}/patient/records/${r.id}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = r.name || "health-record";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      notify("Download started");
    } catch {
      notify("Unable to download record");
    }
  };

  const records = data?.records || [];

  return (
    <Card
      title="Your health records"
      subtitle="Keep important documents close at hand"
      icon={FileText}
    >
      <div className="upload-zone">
        <input
          type="file"
          id="upload"
          accept=".pdf,.png,.jpg,.jpeg,.txt"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) {
              const fd = new FormData();
              fd.append("file", file);
              fd.append("category", "Health document");
              await api("/patient/records", { method: "POST", body: fd });
              refresh();
              notify("Record uploaded");
            }
          }}
        />
        <label htmlFor="upload">
          <Plus size={18} /> Upload a record{" "}
          <small>PDF, PNG, JPG, TXT · up to 5 MB</small>
        </label>
      </div>

      <div className="record-list">
        {records.length > 0 ? (
          records.map((r: any) => (
            <div className="record-item" key={r.id}>
              <FileText />
              <div>
                <b>{r.name}</b>
                <small>
                  {r.category} · {r.created_at?.slice(0, 10)}
                </small>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
                <button
                  className="icon-button"
                  onClick={() => handleDownload(r)}
                  aria-label="Download record"
                  title="Download file"
                >
                  <Download size={18} />
                </button>
                <button
                  className="action-icon-btn"
                  onClick={() => submit(`/patient/records/${r.id}`, "DELETE")}
                  aria-label="Delete record"
                  title="Delete record"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state-card">
            <FileText size={32} style={{ color: "var(--teal)", opacity: 0.7 }} />
            <b>No records uploaded yet</b>
            <p>Upload lab results, doctor prescriptions, or nutrition summaries.</p>
          </div>
        )}
      </div>
    </Card>
  );
}
