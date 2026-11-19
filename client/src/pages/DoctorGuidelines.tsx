import { BookOpen } from "lucide-react";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { DISCLAIMER } from "../constants";

export function DoctorGuidelines({ data }: { data: any }) {
  return (
    <div className="queue-list">
      {(data?.guidelines || []).map((g: any) => (
        <Card
          title={g.condition.replace("_", " ")}
          subtitle="Editable condition guidance"
          icon={BookOpen}
          key={g.condition}
        >
          <div className="guideline-values">
            <span>
              Max sugar / meal <b>{g.maxSugarGPerMeal}g</b>
            </span>
            <span>
              Max sodium / day <b>{g.maxSodiumMgPerDay}mg</b>
            </span>
            <span>
              Daily calories <b>{g.maxCaloriesPerDay}</b>
            </span>
            <span>
              Min fiber / day <b>{g.minFiberGPerDay}g</b>
            </span>
          </div>
          <p>{g.allowedFoodsNote}</p>
          <Badge />
          <p className="disclaimer">{DISCLAIMER}</p>
        </Card>
      ))}
    </div>
  );
}
