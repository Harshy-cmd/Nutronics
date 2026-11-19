import { ShieldCheck } from "lucide-react";

export function Badge({ status = "VERIFIED" }: { status?: string }) {
  return (
    <span className={`badge ${status === "VERIFIED" ? "verified" : "pending"}`}>
      <ShieldCheck size={14} />
      {status === "VERIFIED" ? "Doctor verified" : "Needs review"}
    </span>
  );
}
