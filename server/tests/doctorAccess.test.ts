import test from "node:test";
import assert from "node:assert/strict";
import { isAssignedDoctor } from "../src/services/doctorAccess.js";

test("assigned doctor can pass the patient access check", async () => {
  const result = await isAssignedDoctor("doctor-a", "patient-a", async (doctor, patient) => doctor === "doctor-a" && patient === "patient-a");
  assert.equal(result, true);
});

test("unassigned doctor is denied", async () => {
  const result = await isAssignedDoctor("doctor-b", "patient-a", async () => false);
  assert.equal(result, false);
});

test("empty identities fail closed without querying", async () => {
  let queried = false;
  const result = await isAssignedDoctor("", "patient-a", async () => { queried = true; return true; });
  assert.equal(result, false);
  assert.equal(queried, false);
});
