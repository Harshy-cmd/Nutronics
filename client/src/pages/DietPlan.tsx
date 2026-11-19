import { Utensils } from "lucide-react";
import { api } from "../api";
import { Badge } from "../components/Badge";
import { DISCLAIMER } from "../constants";

export function DietPlan({
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
      <div className="tabs">
        <button className="selected">Today</button>
        <button>This week</button>
        <span>7-day plan · reviewed by Dr. Priya Menon</span>
      </div>
      <div className="meal-list">
        {(data?.meals || []).map((m: any) => (
          <article className="meal-detail" key={m.id}>
            <div className="meal-illustration">
              <Utensils size={23} />
            </div>
            <div className="meal-info">
              <span className="meal-time">
                DAY {m.day + 1} · {m.slot.toUpperCase()}
              </span>
              <h3>{m.name}</h3>
              <p>
                {m.servingSize} · {m.calories} kcal
              </p>
              <Badge status={m.status} />
            </div>
            <div className="nutrient-row">
              <span>
                <b>{m.proteinG}g</b>
                <small>Protein</small>
              </span>
              <span>
                <b>{m.carbsG}g</b>
                <small>Carbs</small>
              </span>
              <span>
                <b>{m.fatG}g</b>
                <small>Fat</small>
              </span>
              <span>
                <b>{m.sodiumMg}mg</b>
                <small>Sodium</small>
              </span>
              <span>
                <b>{m.sugarG}g</b>
                <small>Sugar</small>
              </span>
            </div>
            <button
              className="button outline"
              onClick={async () => {
                const r = await api("/shared/foods");
                const choice = r.foods.find((x: any) => x.id !== m.food_id);
                await submit("/patient/diet/swap", "POST", {
                  mealId: m.id,
                  foodId: choice.id,
                });
              }}
            >
              Swap meal
            </button>
          </article>
        ))}
      </div>
      <p className="disclaimer">{DISCLAIMER}</p>
    </>
  );
}
