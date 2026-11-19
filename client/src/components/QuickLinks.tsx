import { Link } from "react-router-dom";
import { Utensils, Clock, FileText, Sparkles, ArrowRight } from "lucide-react";

export function QuickLinks() {
  return (
    <div className="quick-links">
      {[
        { url: "/patient/diet", icon: Utensils, label: "Your diet plan" },
        { url: "/patient/reminders", icon: Clock, label: "Set a reminder" },
        { url: "/patient/records", icon: FileText, label: "Health records" },
        { url: "/patient/assistant", icon: Sparkles, label: "Ask Nutronics" },
      ].map((x) => (
        <Link to={x.url} className="quick-link" key={x.url}>
          <x.icon size={19} />
          <span>{x.label}</span>
          <ArrowRight size={15} />
        </Link>
      ))}
    </div>
  );
}
