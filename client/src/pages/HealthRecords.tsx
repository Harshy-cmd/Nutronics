import { FileText, Plus, Download } from "lucide-react";
import { api } from "../api";
import { Card } from "../components/Card";

export function HealthRecords({
  data,
  refresh,
  notify,
}: {
  data: any;
  refresh: () => void;
  notify: (s: string) => void;
}) {
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
          <small>PDF, PNG, JPG, TXT Â· up to 5 MB</small>
        </label>
      </div>
      <div className="record-list">
        {(data?.records || []).map((r: any) => (
          <div className="record-item" key={r.id}>
            <FileText />
            <div>
              <b>{r.name}</b>
              <small>
                {r.category} Â· {r.created_at?.slice(0, 10)}
              </small>
            </div>
            <a
              className="icon-button"
              href={`http://localhost:4000/api/patient/records/${r.id}/download`}
              onClick={(e) => {
                e.preventDefault();
                api(`/patient/records/${r.id}/download`).catch(() => {});
                window.open(
                  `http://localhost:4000/api/patient/records/${r.id}/download`,
                  "_blank",
                );
              }}
              aria-label="Download record"
            >
              <Download size={18} />
            </a>
          </div>
        ))}
      </div>
    </Card>
  );
}
