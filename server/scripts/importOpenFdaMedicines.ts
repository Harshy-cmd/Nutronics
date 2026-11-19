import dotenv from "dotenv";
import path from "node:path";
import { db } from "../src/db/schema.js";

dotenv.config({ path: path.resolve(".env") });

const OPENFDA_API_KEY = process.env.OPENFDA_API_KEY;

if (!OPENFDA_API_KEY) {
  console.error("ERROR: OPENFDA_API_KEY is not set in root .env file.");
  process.exit(1);
}

if (OPENFDA_API_KEY === "DEMO_KEY") {
  console.error("ERROR: DEMO_KEY is not allowed. Please provide your real openFDA API key.");
  process.exit(1);
}

// 25 legacy medicines + 25 common chronic condition medications = 50 total
const MEDICINES_TO_IMPORT = [
  // 25 legacy drugs
  { id: "med-001", genericName: "Metformin", defaultTiming: "Take with meals as prescribed" },
  { id: "med-002", genericName: "Amlodipine", defaultTiming: "Take once daily with or without food" },
  { id: "med-003", genericName: "Losartan", defaultTiming: "Take once daily with or without food" },
  { id: "med-004", genericName: "Atorvastatin", defaultTiming: "Take once daily in evening" },
  { id: "med-005", genericName: "Glimepiride", defaultTiming: "Take with breakfast or first main meal" },
  { id: "med-006", genericName: "Telmisartan", defaultTiming: "Take once daily with or without food" },
  { id: "med-007", genericName: "Aspirin", defaultTiming: "Take with food or glass of water" },
  { id: "med-008", genericName: "Furosemide", defaultTiming: "Take in the morning to prevent nocturia" },
  { id: "med-009", genericName: "Pantoprazole", defaultTiming: "Take 30 to 60 minutes before breakfast" },
  { id: "med-010", genericName: "Levothyroxine", defaultTiming: "Take on empty stomach 30 to 60 min before breakfast" },
  { id: "med-011", genericName: "Empagliflozin", defaultTiming: "Take in morning with or without food" },
  { id: "med-012", genericName: "Insulin glargine", defaultTiming: "Inject subcutaneously once daily at same time" },
  { id: "med-013", genericName: "Bisoprolol", defaultTiming: "Take in morning with or without food" },
  { id: "med-014", genericName: "Clopidogrel", defaultTiming: "Take once daily with or without food" },
  { id: "med-015", genericName: "Ramipril", defaultTiming: "Take once daily with or without food" },
  { id: "med-016", genericName: "Lisinopril", defaultTiming: "Take once daily with or without food" },
  { id: "med-017", genericName: "Hydrochlorothiazide", defaultTiming: "Take in morning with food" },
  { id: "med-018", genericName: "Carvedilol", defaultTiming: "Take with food to minimize orthostatic hypotension" },
  { id: "med-019", genericName: "Warfarin", defaultTiming: "Take at same time each evening; maintain consistent vitamin K" },
  { id: "med-020", genericName: "Omeprazole", defaultTiming: "Take 30 to 60 minutes before breakfast" },
  { id: "med-021", genericName: "Cholecalciferol", defaultTiming: "Take with a fat-containing meal for best absorption" }, // Vitamin D3
  { id: "med-022", genericName: "Calcium carbonate", defaultTiming: "Take with food to maximize absorption" },
  { id: "med-023", genericName: "Spironolactone", defaultTiming: "Take with food in morning" },
  { id: "med-024", genericName: "Gabapentin", defaultTiming: "Take as prescribed, usually at bedtime initially" },
  { id: "med-025", genericName: "Acetaminophen", defaultTiming: "Take with or without food; do not exceed 3000-4000mg/day" }, // Paracetamol

  // 25 common chronic medications
  { id: "med-026", genericName: "Rosuvastatin", defaultTiming: "Take once daily with or without food" },
  { id: "med-027", genericName: "Simvastatin", defaultTiming: "Take once daily in evening" },
  { id: "med-028", genericName: "Metoprolol", defaultTiming: "Take with or immediately after a meal" },
  { id: "med-029", genericName: "Albuterol", defaultTiming: "Inhale as directed for acute bronchospasm" },
  { id: "med-030", genericName: "Sertraline", defaultTiming: "Take once daily morning or evening with food" },
  { id: "med-031", genericName: "Escitalopram", defaultTiming: "Take once daily morning or evening with or without food" },
  { id: "med-032", genericName: "Montelukast", defaultTiming: "Take once daily in evening" },
  { id: "med-033", genericName: "Duloxetine", defaultTiming: "Take once daily with or without food; swallow whole" },
  { id: "med-034", genericName: "Bupropion", defaultTiming: "Take in morning; swallow whole, do not crush" },
  { id: "med-035", genericName: "Prednisone", defaultTiming: "Take with food or milk in morning" },
  { id: "med-036", genericName: "Tamsulosin", defaultTiming: "Take 30 minutes after same meal each day" },
  { id: "med-037", genericName: "Fluoxetine", defaultTiming: "Take once daily in morning" },
  { id: "med-038", genericName: "Citalopram", defaultTiming: "Take once daily with or without food" },
  { id: "med-039", genericName: "Pravastatin", defaultTiming: "Take once daily in evening with or without food" },
  { id: "med-040", genericName: "Meloxicam", defaultTiming: "Take once daily with food or water" },
  { id: "med-041", genericName: "Tramadol", defaultTiming: "Take every 4-6 hours as prescribed for pain" },
  { id: "med-042", genericName: "Allopurinol", defaultTiming: "Take after meals with plenty of fluids" },
  { id: "med-043", genericName: "Finasteride", defaultTiming: "Take once daily with or without food" },
  { id: "med-044", genericName: "Sitagliptin", defaultTiming: "Take once daily with or without food" },
  { id: "med-045", genericName: "Dapagliflozin", defaultTiming: "Take once daily in morning with or without food" },
  { id: "med-046", genericName: "Semaglutide", defaultTiming: "Inject subcutaneously once weekly or take oral on empty stomach" },
  { id: "med-047", genericName: "Atenolol", defaultTiming: "Take once daily with or without food" },
  { id: "med-048", genericName: "Diltiazem", defaultTiming: "Take before meals and at bedtime as prescribed" },
  { id: "med-049", genericName: "Potassium chloride", defaultTiming: "Take with meals and full glass of water; do not crush" },
  { id: "med-050", genericName: "Clonazepam", defaultTiming: "Take as prescribed at bedtime" },
];

async function fetchFdaLabel(genericName: string): Promise<any | null> {
  const query = `openfda.generic_name:"${genericName}"`;
  const url = `https://api.fda.gov/drug/label.json?search=${encodeURIComponent(query)}&limit=1&api_key=${encodeURIComponent(OPENFDA_API_KEY!)}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      // If specific quote search fails, try broader substance_name search
      const fallbackUrl = `https://api.fda.gov/drug/label.json?search=openfda.substance_name:"${encodeURIComponent(genericName)}"&limit=1&api_key=${encodeURIComponent(OPENFDA_API_KEY!)}`;
      const res2 = await fetch(fallbackUrl);
      if (!res2.ok) return null;
      const data2 = await res2.json();
      return data2.results?.[0] || null;
    }
    const data = await res.json();
    return data.results?.[0] || null;
  } catch {
    return null;
  }
}

function truncate(str: string | undefined, maxLen = 1000): string | null {
  if (!str) return null;
  const clean = str.replace(/\s+/g, " ").trim();
  return clean.length > maxLen ? clean.slice(0, maxLen) + "..." : clean;
}

export async function importOpenFdaMedicines() {
  console.log(`Starting openFDA drug label import for ${MEDICINES_TO_IMPORT.length} medications...`);

  // Clear existing medicines table
  db.exec("DELETE FROM medicines;");

  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO medicines (
      id, genericName, brandNames, drugClass, timingInstruction,
      foodInteractionNote, warningSigns, indications, warnings,
      boxedWarning, rxNormId, source
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?
    )
  `);

  let successCount = 0;
  let unmappedCount = 0;
  const unmapped: string[] = [];

  for (const item of MEDICINES_TO_IMPORT) {
    console.log(`Fetching openFDA label for: "${item.genericName}"...`);
    const label = await fetchFdaLabel(item.genericName);

    if (label) {
      const openfda = label.openfda || {};
      const brandNames = openfda.brand_name ? JSON.stringify(openfda.brand_name.slice(0, 5)) : "[]";
      const drugClass = openfda.pharm_class_epc?.[0] || openfda.pharm_class_moa?.[0] || null;
      const indications = truncate(label.indications_and_usage?.[0]);
      const warnings = truncate(label.warnings?.[0] || label.warnings_and_cautions?.[0]);
      const boxedWarning = truncate(label.boxed_warning?.[0]);
      const rxNormId = openfda.rxcui?.[0] || null;

      insertStmt.run(
        item.id,
        item.genericName,
        brandNames,
        drugClass,
        null, // timingInstruction NULL per instruction (store only API returned text)
        null, // foodInteractionNote NULL per instruction
        null, // warningSigns NULL per instruction
        indications,
        warnings,
        boxedWarning,
        rxNormId,
        "OPENFDA",
      );
      successCount++;
      console.log(`  Imported ${item.id} (${item.genericName}): class="${drugClass || "—"}", brands=${brandNames}, rxcui=${rxNormId || "—"}`);
    } else {
      unmappedCount++;
      unmapped.push(item.genericName);
      console.warn(`  Warning: openFDA label not found for "${item.genericName}"`);
      insertStmt.run(
        item.id,
        item.genericName,
        "[]",
        null,
        null, // timingInstruction NULL
        null, // foodInteractionNote NULL
        null, // warningSigns NULL
        null,
        null,
        null,
        null,
        "OPENFDA_UNMAPPED",
      );
    }

    // Rate limit: 300ms pause between openFDA queries
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\nImport Summary:`);
  console.log(`- Successfully imported with openFDA labels: ${successCount}`);
  console.log(`- Unmapped drugs: ${unmappedCount} (${unmapped.join(", ")})`);
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}`) {
  importOpenFdaMedicines().catch(e => {
    console.error(e);
    process.exit(1);
  });
}
