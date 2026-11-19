import { MessageCircle, Check, CheckCircle2 } from "lucide-react";
import { api } from "../api";
import { Card } from "../components/Card";

export function DoctorQueue({
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

  const items = data?.items || [];

  return (
    <div className="queue-list">
      {items.length > 0 ? (
        items.map((x: any) => (
          <Card
            key={x.id}
            title={x.question}
            subtitle={`${x.patient_name} · ${x.created_at?.slice(0, 10)}`}
            icon={MessageCircle}
          >
            <p>{x.answer}</p>
            <div className="toolbar">
              <button
                className="button primary"
                onClick={() =>
                  submit(`/doctor/verification-queue/${x.id}`, "PATCH", {
                    status: "VERIFIED",
                  })
                }
              >
                <Check size={16} /> Approve
              </button>
              <button
                className="button subtle"
                onClick={() =>
                  submit(`/doctor/verification-queue/${x.id}`, "PATCH", {
                    status: "REJECTED",
                  })
                }
              >
                Reject
              </button>
            </div>
          </Card>
        ))
      ) : (
        <div
          className="empty-state-card"
          style={{
            background: "#fff",
            borderRadius: 14,
            border: "1px solid var(--line)",
            padding: "48px 20px",
          }}
        >
          <CheckCircle2 size={40} style={{ color: "var(--teal)" }} />
          <b style={{ fontSize: 16 }}>All caught up!</b>
          <p>There are no patient answers pending clinical review right now.</p>
        </div>
      )}
    </div>
  );
}
