import { useState } from "react";
import { BookOpen, Save } from "lucide-react";
import { Card } from "../components/Card";
import { api } from "../api";
import { DISCLAIMER } from "../constants";

function GuidelineEditor({ guideline, refresh, notify }: { guideline: any; refresh: () => void; notify: (message: string) => void }) {
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState({
    maxSugarGPerMeal: guideline.maxSugarGPerMeal,
    maxSodiumMgPerDay: guideline.maxSodiumMgPerDay,
    maxCaloriesPerDay: guideline.maxCaloriesPerDay,
    minFiberGPerDay: guideline.minFiberGPerDay,
    allowedFoodsNote: guideline.allowedFoodsNote || "",
  });
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api(`/doctor/guidelines/${encodeURIComponent(guideline.condition)}`, { method: "PUT", body: JSON.stringify({
        ...values,
        maxSugarGPerMeal: Number(values.maxSugarGPerMeal),
        maxSodiumMgPerDay: Number(values.maxSodiumMgPerDay),
        maxCaloriesPerDay: Number(values.maxCaloriesPerDay),
        minFiberGPerDay: Number(values.minFiberGPerDay),
      }) });
      notify("Guideline saved");
      refresh();
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title={guideline.condition.replaceAll("_", " ")} subtitle="Edit the shared rule values used by the nutrition demo" icon={BookOpen}>
      <form onSubmit={save}>
        <div className="form-grid guideline-form">
          <label>Max sugar per meal (g)<input type="number" min="0" step="0.1" required value={values.maxSugarGPerMeal} onChange={e => setValues({ ...values, maxSugarGPerMeal: e.target.value })} /></label>
          <label>Max sodium per day (mg)<input type="number" min="0" step="1" required value={values.maxSodiumMgPerDay} onChange={e => setValues({ ...values, maxSodiumMgPerDay: e.target.value })} /></label>
          <label>Daily calorie limit<input type="number" min="0" step="1" required value={values.maxCaloriesPerDay} onChange={e => setValues({ ...values, maxCaloriesPerDay: e.target.value })} /></label>
          <label>Minimum fiber per day (g)<input type="number" min="0" step="0.1" required value={values.minFiberGPerDay} onChange={e => setValues({ ...values, minFiberGPerDay: e.target.value })} /></label>
          <label className="wide">Guidance note<textarea rows={3} value={values.allowedFoodsNote} onChange={e => setValues({ ...values, allowedFoodsNote: e.target.value })} /></label>
        </div>
        <button className="button primary" disabled={saving}><Save size={16} />{saving ? "Saving…" : "Save guideline"}</button>
      </form>
      <p className="disclaimer">Changes apply to this shared demonstration guidance. {DISCLAIMER}</p>
    </Card>
  );
}

export function DoctorGuidelines({ data, refresh, notify }: { data: any; refresh: () => void; notify: (message: string) => void }) {
  return <div className="guideline-list">{(data?.guidelines || []).map((guideline: any) => <GuidelineEditor key={guideline.condition} guideline={guideline} refresh={refresh} notify={notify} />)}</div>;
}
