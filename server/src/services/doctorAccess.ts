import { db } from "../db/schema.js";

type AssignmentLookup = (doctorId: string, patientId: string) => Promise<boolean>;

const lookupAssignment: AssignmentLookup = async (doctorId, patientId) => {
  const row = await db.prepare(
    "SELECT 1 FROM doctor_patient_assignments WHERE doctor_id=? AND patient_id=?",
  ).get(doctorId, patientId);
  return Boolean(row);
};

export function isAssignedDoctor(doctorId: string, patientId: string, lookup: AssignmentLookup = lookupAssignment) {
  if (!doctorId || !patientId) return Promise.resolve(false);
  return lookup(doctorId, patientId);
}
