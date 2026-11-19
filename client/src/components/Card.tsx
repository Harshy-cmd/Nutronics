import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function Card({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  children?: ReactNode;
}) {
  return (
    <section className="card">
      <div className="card-head">
        <span className="card-icon">
          <Icon size={18} />
        </span>
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      <div className="card-body">{children}</div>
    </section>
  );
}
