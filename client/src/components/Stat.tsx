import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function Stat({
  label,
  value,
  note,
  icon: Icon,
  tint,
  to,
  onClick,
}: {
  label: string;
  value: any;
  note: string;
  icon: LucideIcon;
  tint: string;
  to?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className={`stat-icon ${tint}`}>
        <Icon size={20} />
      </span>
      <div>
        <small>{label}</small>
        <b>{value}</b>
        <span>{note}</span>
      </div>
      {(to || onClick) && <ChevronRight className="stat-arrow" size={17} />}
    </>
  );

  if (to) {
    return (
      <Link to={to} className="stat-card stat-card-link">
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        className="stat-card stat-card-link stat-card-button"
        onClick={onClick}
        aria-label={`${label}: ${value}. ${note}`}
      >
        {content}
      </button>
    );
  }

  return <div className="stat-card">{content}</div>;
}
