import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function Stat({
  label,
  value,
  note,
  icon: Icon,
  tint,
}: {
  label: string;
  value: any;
  note: string;
  icon: LucideIcon;
  tint: string;
}) {
  return (
    <div className="stat-card">
      <span className={`stat-icon ${tint}`}>
        <Icon size={20} />
      </span>
      <div>
        <small>{label}</small>
        <b>{value}</b>
        <span>{note}</span>
      </div>
      <ChevronRight className="stat-arrow" size={17} />
    </div>
  );
}
