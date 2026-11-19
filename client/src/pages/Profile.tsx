import { Settings, Heart, Plus } from "lucide-react";
import { api } from "../api";
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
        title="Emergency contacts"
        subtitle="People you trust to reach in an urgent moment"
        icon={Heart}
      >
        {(data?.contacts || []).map((c: any) => (
          <div className="record-item" key={c.id}>
            <div className="avatar">{c.name[0]}</div>
            <div>
              <b>{c.name}</b>
              <small>
                {c.relationship} Â· {c.phone}
              </small>
            </div>
          </div>
        ))}
        <button
          className="button outline"
          onClick={() => {
            const name = prompt("Contact name"),
              phone = prompt("Phone number");
            if (name && phone)
              submit("/patient/contacts", "POST", {
                name,
                phone,
                relationship: "Family",
              });
          }}
        >
          <Plus size={16} /> Add contact
        </button>
      </Card>
    </>
  );
}
