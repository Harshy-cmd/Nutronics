import { useState } from "react";
import { Utensils, X, Check, RefreshCw } from "lucide-react";
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
  const [tab, setTab] = useState<"today" | "week">("today");
  const [swappingMeal, setSwappingMeal] = useState<any | null>(null);
  const [foodOptions, setFoodOptions] = useState<any[]>([]);
  const [selectedFoodId, setSelectedFoodId] = useState<string>("");
  const [savingSwap, setSavingSwap] = useState(false);

  const submit = async (path: string, method = "POST", body: any = {}) => {
    try {
      await api(path, { method, body: JSON.stringify(body) });
      notify("Saved successfully");
      refresh();
    } catch (e) {
      notify((e as Error).message);
    }
  };

  const handleOpenSwap = async (meal: any) => {
    setSwappingMeal(meal);
    try {
      const res = await api("/shared/foods");
      const list = res.foods || [];
      setFoodOptions(list);
      const firstChoice = list.find((f: any) => f.id !== meal.food_id);
      setSelectedFoodId(firstChoice?.id || list[0]?.id || "");
    } catch {
      notify("Unable to load food options");
    }
  };

  const handleConfirmSwap = async () => {
    if (!swappingMeal || !selectedFoodId) return;
    setSavingSwap(true);
    try {
      await submit("/patient/diet/swap", "POST", {
        mealId: swappingMeal.id,
        foodId: selectedFoodId,
      });
      setSwappingMeal(null);
    } finally {
      setSavingSwap(false);
    }
  };

  const allMeals = data?.meals || [];
  const meals = allMeals.filter((m: any) => tab === "week" || m.day === 0);

  return (
    <>
      <div className="tabs">
        <button
          className={tab === "today" ? "selected" : ""}
          onClick={() => setTab("today")}
        >
          Today
        </button>
        <button
          className={tab === "week" ? "selected" : ""}
          onClick={() => setTab("week")}
        >
          This week
        </button>
        <span>7-day plan · reviewed by Dr. Priya Menon</span>
      </div>

      <div className="meal-list">
        {meals.length > 0 ? (
          meals.map((m: any) => (
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
                  {m.servingSize || "1 serving"} · {m.calories || "—"} kcal
                </p>
                <Badge status={m.status} />
              </div>
              <div className="nutrient-row">
                <span>
                  <b>{m.proteinG || 0}g</b>
                  <small>Protein</small>
                </span>
                <span>
                  <b>{m.carbsG || 0}g</b>
                  <small>Carbs</small>
                </span>
                <span>
                  <b>{m.fatG || 0}g</b>
                  <small>Fat</small>
                </span>
                <span>
                  <b>{m.sodiumMg != null ? `${m.sodiumMg}mg` : "—"}</b>
                  <small>Sodium</small>
                </span>
                <span>
                  <b>{m.sugarG != null ? `${m.sugarG}g` : "—"}</b>
                  <small>Sugar</small>
                </span>
              </div>
              <button
                className="button outline"
                onClick={() => handleOpenSwap(m)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <RefreshCw size={14} /> Swap meal
              </button>
            </article>
          ))
        ) : (
          <div className="empty-state-card" style={{ background: "#fff", borderRadius: 14, border: "1px solid var(--line)" }}>
            <Utensils size={32} style={{ color: "var(--teal)", opacity: 0.7 }} />
            <b>No meals found for this view.</b>
            <p>Your care team will schedule upcoming meals for your review.</p>
          </div>
        )}
      </div>

      {swappingMeal && (
        <div className="modal-back">
          <div className="modal">
            <button
              className="close"
              onClick={() => setSwappingMeal(null)}
              aria-label="Close"
            >
              <X />
            </button>
            <div className="eyebrow">MEAL ALTERNATIVE</div>
            <h2>Swap {swappingMeal.name}</h2>
            <p style={{ fontSize: 13, color: "var(--muted)" }}>
              Choose a healthy alternative for DAY {swappingMeal.day + 1} (
              {swappingMeal.slot}).
            </p>
            <div className="modal-form">
              <label>
                Select new food option
                <select
                  value={selectedFoodId}
                  onChange={(e) => setSelectedFoodId(e.target.value)}
                >
                  {foodOptions.map((f: any) => (
                    <option key={f.id} value={f.id}>
                      {f.name} {f.calories ? `(${f.calories} kcal, ${f.proteinG}g protein)` : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="modal-actions">
              <button
                className="button subtle"
                onClick={() => setSwappingMeal(null)}
              >
                Cancel
              </button>
              <button
                className="button primary"
                onClick={handleConfirmSwap}
                disabled={savingSwap || !selectedFoodId}
              >
                <Check size={16} />{" "}
                {savingSwap ? "Updating…" : "Confirm swap"}
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="disclaimer">{DISCLAIMER}</p>
    </>
  );
}
