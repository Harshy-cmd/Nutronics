import { ShieldCheck } from "lucide-react";

export function Badge({ status = "VERIFIED" }: { status?: string }) {
  const label = status === "VERIFIED" ? "Clinician reviewed" : status === "RULE_MATCHED" ? "Rule match · not reviewed" : status === "REJECTED" ? "Not approved" : "Needs review";
  const verified = status === "VERIFIED";
  return (
    <span className={`badge ${verified ? "verified" : "pending"}`}>
      <ShieldCheck size={14} />
      {label}
    </span>
  );
}
