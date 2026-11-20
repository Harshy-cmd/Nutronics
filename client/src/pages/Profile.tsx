import { useState } from "react";
import { Settings, Heart, Plus, Trash2, X, Check } from "lucide-react";
import { api } from "../api";
import { apiBlob } from "../api";
import { Card } from "../components/Card";

export function Profile({
  data,
  refresh,
  notify,
}: {
  data: any;
  refresh: () => void;
  notify: (s: string) => void;
}) {
  const [showAddContact, setShowAddContact] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactRel, setContactRel] = useState("Family");
  const [savingContact, setSavingContact] = useState(false);

  const submit = async (path: string, method = "POST", body: any = {}) => {
    try {
      await api(path, { method, body: JSON.stringify(body) });
      notify("Saved successfully");
      refresh();
    } catch (e) {
      notify((e as Error).message);
    }
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactPhone.trim()) return;
    setSavingContact(true);
    try {
      await submit("/patient/contacts", "POST", {
        name: contactName.trim(),
        phone: contactPhone.trim(),
        relationship: contactRel,
      });
      setContactName("");
      setContactPhone("");
      setShowAddContact(false);
    } finally {
      setSavingContact(false);
    }
  };

  const contacts = data?.contacts || [];
  const exportData = async () => {
    try {
      const result = await api("/patient/export");
      const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: "application/json" }));
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = "nutronics-data-export.json"; anchor.click(); URL.revokeObjectURL(url);
      notify("Data export downloaded");
    } catch (e) { notify((e as Error).message); }
  };
  const exportCsv = async () => {
    try {
      const blob = await apiBlob("/patient/export.csv");
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = "nutronics-data-export.csv"; anchor.click(); URL.revokeObjectURL(url);
      notify("CSV export downloaded");
    } catch (e) { notify((e as Error).message); }
  };

  return (
    <>
      <Card
        title="Your profile"
        subtitle="Help us personalize your care space"
        icon={Settings}
      >
        <div className="form-grid">
          <label>
            Full name
            <input defaultValue={data?.user?.name} id="name" />
          </label>
          <label>
            Age
            <input type="number" defaultValue={data?.user?.age} id="age" />
          </label>
          <label className="wide">
            Health conditions
            <input
              defaultValue={(data?.user?.conditions || []).join(", ")}
              id="conditions"
            />
            <small>Separate conditions with commas.</small>
          </label>
        </div>
        <button
          className="button primary"
          onClick={() =>
            submit("/patient/profile", "PATCH", {
              name: (document.getElementById("name") as HTMLInputElement).value,
              age: Number(
                (document.getElementById("age") as HTMLInputElement).value,
              ),
              conditions: (
                document.getElementById("conditions") as HTMLInputElement
              ).value
                .split(",")
                .map((x) => x.trim().toUpperCase())
                .filter(Boolean),
            })
          }
        >
          Save profile
        </button>
      </Card>

      <Card
        title="Privacy and data controls"
        subtitle="This demo stores profile, health logs, contact details, and record metadata in its hosted backend. Uploaded files are stored separately in private storage."
        icon={Settings}
      >
        <p>Nutronics is not a medical service. Avoid entering real patient information. The JSON export includes your account profile, logs, schedules, conversations, contact details, SOS events, and record file names. Download uploaded files separately from Health records.</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="button primary" onClick={() => void exportData()}>Download my data</button>
          <button className="button outline" onClick={() => void exportCsv()}>Download CSV</button>
          <button className="button outline" onClick={async () => { if (window.confirm("Request administrator follow-up to delete this account and its stored health data? The request does not immediately erase data.")) await submit("/patient/deletion-request", "POST"); }}>Request account deletion</button>
        </div>
        <small>Deletion requests require administrator follow-up. For support, contact pujerakshay6002@gmail.com.</small>
        <h3>Recent account activity</h3>
        <div className="record-list">
          {(data?.activity || []).map((event: any, index: number) => <div className="record-item" key={`${event.action}-${event.created_at}-${index}`}><div><b>{event.action.replaceAll("_", " ")}</b><small>{event.actor_name || "Your account"} · {new Date(event.created_at).toLocaleString()}</small></div></div>)}
          {!data?.activity?.length && <small>No account activity recorded yet.</small>}
        </div>
      </Card>
      <Card
        title="Emergency contacts"
        subtitle="People you trust to reach in an urgent moment"
        icon={Heart}
      >
        <div className="record-list" style={{ marginBottom: 16 }}>
          {contacts.length > 0 ? (
            contacts.map((c: any) => (
              <div className="record-item" key={c.id}>
                <div className="avatar">{c.name[0]}</div>
                <div>
                  <b>{c.name}</b>
                  <small>
                    {c.relationship} · {c.phone}
                  </small>
                </div>
                <button
                  className="action-icon-btn"
                  style={{ marginLeft: "auto" }}
                  onClick={() => submit(`/patient/contacts/${c.id}`, "DELETE")}
                  aria-label={`Delete ${c.name}`}
                  title="Remove contact"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          ) : (
            <div className="empty-state-card">
              <p>No emergency contacts added yet.</p>
            </div>
          )}
        </div>
        <button
          className="button outline"
          onClick={() => setShowAddContact(true)}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <Plus size={16} /> Add contact
        </button>
      </Card>

      {showAddContact && (
        <div className="modal-back">
          <div className="modal">
            <button
              className="close"
              onClick={() => setShowAddContact(false)}
              aria-label="Close"
            >
              <X />
            </button>
            <div className="eyebrow">NEW CONTACT</div>
            <h2>Add emergency contact</h2>
            <form onSubmit={handleCreateContact} className="modal-form">
              <label>
                Contact name
                <input
                  required
                  placeholder="e.g. Priya Sharma"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  autoFocus
                />
              </label>

              <label>
                Phone number
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                />
              </label>

              <label>
                Relationship
                <select
                  value={contactRel}
                  onChange={(e) => setContactRel(e.target.value)}
                >
                  <option value="Family">Family</option>
                  <option value="Doctor">Doctor / Caregiver</option>
                  <option value="Friend">Friend</option>
                  <option value="Neighbor">Neighbor</option>
                  <option value="Other">Other</option>
                </select>
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="button subtle"
                  onClick={() => setShowAddContact(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button primary"
                  disabled={savingContact || !contactName.trim() || !contactPhone.trim()}
                >
                  <Check size={16} />{" "}
                  {savingContact ? "Saving…" : "Save contact"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
