import fs from "node:fs";
import path from "node:path";
import { db } from "../src/db/schema.js";

function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  for (const line of lines) {
    const fields: string[] = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuote = !inQuote;
      } else if (ch === "," && !inQuote) {
        fields.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    fields.push(cur.trim());
    rows.push(fields);
  }
  return rows;
}

interface NutrientProfile {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sodiumMg: number;
  sugarG: number;
  potassiumMg: number | null;
  phosphorusMg: number | null;
}

export function importIfct() {
  const compositionsPath = path.resolve(
    "node_modules/ifct2017/compositions/index.csv",
  );
  if (!fs.existsSync(compositionsPath)) {
    throw new Error(`IFCT compositions file not found at ${compositionsPath}`);
  }

  const csvContent = fs.readFileSync(compositionsPath, "utf8");
  const rows = parseCsv(csvContent);
  const header = rows[0];

  const colIdx = {
    code: header.indexOf("code"),
    name: header.indexOf("name"),
    grup: header.indexOf("grup"),
    enerc: header.indexOf("enerc"),
    protcnt: header.indexOf("protcnt"),
    choavldf: header.indexOf("choavldf"),
    fatce: header.indexOf("fatce"),
    fibtg: header.indexOf("fibtg"),
    na: header.indexOf("na"),
    fsugar: header.indexOf("fsugar"),
    k: header.indexOf("k"),
    p: header.indexOf("p"),
  };

  const ifctNutrients = new Map<string, NutrientProfile>();

  // Ensure foods table matches nullable nutrient schema
  db.exec(`
    DROP TABLE IF EXISTS foods;
    CREATE TABLE foods (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      servingSize TEXT NOT NULL,
      calories REAL DEFAULT NULL,
      proteinG REAL DEFAULT NULL,
      carbsG REAL DEFAULT NULL,
      fatG REAL DEFAULT NULL,
      fiberG REAL DEFAULT NULL,
      sodiumMg REAL DEFAULT NULL,
      sugarG REAL DEFAULT NULL,
      potassiumMg REAL DEFAULT NULL,
      phosphorusMg REAL DEFAULT NULL,
      glycemicIndex TEXT DEFAULT NULL,
      safeForConditions TEXT DEFAULT NULL,
      source TEXT NOT NULL,
      isEstimated INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_foods_name ON foods(name);
    CREATE INDEX IF NOT EXISTS idx_foods_category ON foods(category);
  `);

  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO foods (
      id, name, category, servingSize, calories, proteinG, carbsG, fatG,
      fiberG, sodiumMg, sugarG, potassiumMg, phosphorusMg, glycemicIndex,
      safeForConditions, source, isEstimated
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?
    )
  `);

  let ifctCount = 0;

  db.exec("BEGIN TRANSACTION;");

  try {
    // 1. Insert all 542 real IFCT foods
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const code = r[colIdx.code];
      const name = r[colIdx.name];
      const grup = r[colIdx.grup] || "Other";
      const enercKj = parseFloat(r[colIdx.enerc]) || 0;
      const prot = parseFloat(r[colIdx.protcnt]) || 0;
      const carbs = parseFloat(r[colIdx.choavldf]) || 0;
      const fat = parseFloat(r[colIdx.fatce]) || 0;
      const fib = parseFloat(r[colIdx.fibtg]) || 0;
      const naG = parseFloat(r[colIdx.na]) || 0;
      const sugar = parseFloat(r[colIdx.fsugar]);
      const kG = parseFloat(r[colIdx.k]);
      const pG = parseFloat(r[colIdx.p]);

      let calories = Math.round((enercKj / 4.184) * 10) / 10;
      if (calories === 0 && fat > 0) {
        // Group T oils had enerc=0 in IFCT CSV; calculate standard Atwater energy (9 kcal/g fat)
        calories = Math.round((4 * prot + 4 * carbs + 9 * fat) * 10) / 10;
      }
      const sodiumMg = Math.round(naG * 1000 * 10) / 10;
      const potassiumMg = !isNaN(kG) ? Math.round(kG * 1000 * 10) / 10 : null;
      const phosphorusMg = !isNaN(pG) ? Math.round(pG * 1000 * 10) / 10 : null;
      const sugarG = !isNaN(sugar) ? Math.round(sugar * 10) / 10 : 0;

      const profile: NutrientProfile = {
        calories,
        proteinG: prot,
        carbsG: carbs,
        fatG: fat,
        fiberG: fib,
        sodiumMg,
        sugarG,
        potassiumMg,
        phosphorusMg,
      };

      ifctNutrients.set(code, profile);

      insertStmt.run(
        `IFCT-${code}`,
        name,
        grup,
        "100 g",
        calories,
        prot,
        carbs,
        fat,
        fib,
        sodiumMg,
        sugarG,
        potassiumMg,
        phosphorusMg,
        null, // glycemicIndex null per instruction
        null, // safeForConditions null per instruction
        "IFCT2017",
        0, // measured raw food
      );
      ifctCount++;
    }

    // Helper to calculate composite dish nutrient values from IFCT ingredient amounts (in grams)
    function computeRecipe(ingredients: { code: string; grams: number }[]): NutrientProfile {
      let cal = 0, p = 0, c = 0, f = 0, fib = 0, na = 0, sug = 0;
      let k: number | null = 0;
      let phos: number | null = 0;

      for (const ing of ingredients) {
        const nut = ifctNutrients.get(ing.code);
        if (!nut) continue;
        const ratio = ing.grams / 100;
        cal += nut.calories * ratio;
        p += nut.proteinG * ratio;
        c += nut.carbsG * ratio;
        f += nut.fatG * ratio;
        fib += nut.fiberG * ratio;
        na += nut.sodiumMg * ratio;
        sug += nut.sugarG * ratio;
        if (nut.potassiumMg !== null && k !== null) k += nut.potassiumMg * ratio;
        else k = null;
        if (nut.phosphorusMg !== null && phos !== null) phos += nut.phosphorusMg * ratio;
        else phos = null;
      }

      return {
        calories: Math.round(cal * 10) / 10,
        proteinG: Math.round(p * 10) / 10,
        carbsG: Math.round(c * 10) / 10,
        fatG: Math.round(f * 10) / 10,
        fiberG: Math.round(fib * 10) / 10,
        sodiumMg: Math.round(na * 10) / 10,
        sugarG: Math.round(sug * 10) / 10,
        potassiumMg: k !== null ? Math.round(k * 10) / 10 : null,
        phosphorusMg: phos !== null ? Math.round(phos * 10) / 10 : null,
      };
    }

    // Standard Indian composite recipes computed from IFCT ingredients
    const recipes: Record<
      string,
      {
        name: string;
        serving: string;
        category: string;
        ing: { code: string; grams: number }[];
      }
    > = {
      "food-001": {
        name: "Moong Dal Tadka",
        serving: "1 cup (200g)",
        category: "Grain Legumes",
        ing: [
          { code: "B010", grams: 40 },
          { code: "T012", grams: 5 },
          { code: "D075", grams: 15 },
          { code: "G017", grams: 10 },
        ],
      },
      "food-002": {
        name: "Whole Wheat Roti",
        serving: "1 medium roti (35g)",
        category: "Cereals and Millets",
        ing: [{ code: "A019", grams: 30 }],
      },
      "food-003": {
        name: "Steamed Idli",
        serving: "2 idlis (80g)",
        category: "Cereals and Millets",
        ing: [
          { code: "A014", grams: 30 },
          { code: "B003", grams: 10 },
        ],
      },
      "food-004": {
        name: "Ragi Dosa",
        serving: "1 dosa (60g)",
        category: "Cereals and Millets",
        ing: [
          { code: "A010", grams: 25 },
          { code: "A014", grams: 15 },
          { code: "T012", grams: 3 },
        ],
      },
      "food-005": {
        name: "Vegetable Sambar",
        serving: "1 cup (200g)",
        category: "Grain Legumes",
        ing: [
          { code: "B021", grams: 25 },
          { code: "D075", grams: 25 },
          { code: "G017", grams: 20 },
          { code: "D046", grams: 20 },
          { code: "T012", grams: 4 },
        ],
      },
      "food-006": {
        name: "Paneer Tikka",
        serving: "100 g",
        category: "Milk and Milk Products",
        ing: [
          { code: "L003", grams: 80 },
          { code: "L002", grams: 15 },
          { code: "T012", grams: 5 },
        ],
      },
      "food-007": {
        name: "Brown Rice",
        serving: "1 cup cooked (150g)",
        category: "Cereals and Millets",
        ing: [{ code: "A013", grams: 50 }],
      },
      "food-008": {
        name: "Upma",
        serving: "1 cup (180g)",
        category: "Cereals and Millets",
        ing: [
          { code: "A022", grams: 45 },
          { code: "T012", grams: 5 },
          { code: "G017", grams: 15 },
          { code: "F002", grams: 10 },
        ],
      },
      "food-009": {
        name: "Khichdi",
        serving: "1 cup (200g)",
        category: "Cereals and Millets",
        ing: [
          { code: "A014", grams: 35 },
          { code: "B010", grams: 20 },
          { code: "T013", grams: 3 },
        ],
      },
      "food-010": {
        name: "Poha",
        serving: "1 cup (150g)",
        category: "Cereals and Millets",
        ing: [
          { code: "A011", grams: 45 },
          { code: "H012", grams: 8 },
          { code: "G017", grams: 15 },
          { code: "T012", grams: 4 },
        ],
      },
      "food-011": {
        name: "Curd",
        serving: "1 cup (150g)",
        category: "Milk and Milk Products",
        ing: [{ code: "L002", grams: 150 }],
      },
      "food-012": {
        name: "Sprouts",
        serving: "100 g",
        category: "Grain Legumes",
        ing: [{ code: "B011", grams: 100 }],
      },
      "food-014": {
        name: "Palak Paneer",
        serving: "1 cup (180g)",
        category: "Vegetables & Dairy",
        ing: [
          { code: "C033", grams: 90 },
          { code: "L003", grams: 40 },
          { code: "T012", grams: 5 },
        ],
      },
      "food-015": {
        name: "Rajma",
        serving: "1 cup cooked (200g)",
        category: "Grain Legumes",
        ing: [
          { code: "B020", grams: 45 },
          { code: "D075", grams: 25 },
          { code: "G017", grams: 20 },
          { code: "T012", grams: 5 },
        ],
      },
      "food-016": {
        name: "Chole",
        serving: "1 cup cooked (200g)",
        category: "Grain Legumes",
        ing: [
          { code: "B002", grams: 45 },
          { code: "D075", grams: 25 },
          { code: "G017", grams: 20 },
          { code: "T012", grams: 5 },
        ],
      },
    };

    // Whole foods directly mapped from IFCT
    const directMappings: Record<
      string,
      {
        code: string;
        name: string;
        serving: string;
        category: string;
        isEstimated?: number;
      }
    > = {
      "food-017": {
        code: "E001",
        name: "Apple",
        serving: "1 medium (150g)",
        category: "Fruits",
      },
      "food-018": {
        code: "E012",
        name: "Banana",
        serving: "1 medium (100g)",
        category: "Fruits",
      },
      "food-019": {
        code: "E036",
        name: "Mango",
        serving: "1 cup sliced (150g)",
        category: "Fruits",
      },
      "food-020": {
        code: "E047",
        name: "Orange",
        serving: "1 medium (130g)",
        category: "Fruits",
      },
      "food-021": {
        code: "E049",
        name: "Papaya",
        serving: "1 cup (145g)",
        category: "Fruits",
      },
      "food-022": {
        code: "E028",
        name: "Guava",
        serving: "1 medium (100g)",
        category: "Fruits",
      },
      "food-023": {
        code: "H001",
        name: "Almonds",
        serving: "1 oz (28g)",
        category: "Nuts and Oil Seeds",
      },
      "food-024": {
        code: "H021",
        name: "Walnuts",
        serving: "1 oz (28g)",
        category: "Nuts and Oil Seeds",
      },
      "food-025": {
        code: "M004",
        name: "Boiled Egg",
        serving: "1 large (50g)",
        category: "Egg and Egg Products",
      },
      "food-026": {
        code: "N003",
        name: "Chicken Breast",
        serving: "1 breast (120g raw; values for raw food, cooked weight unknown)",
        category: "Poultry",
        isEstimated: 1,
      },
      "food-027": {
        code: "P068",
        name: "Salmon",
        serving: "1 fillet (100g raw; values for raw food, cooked weight unknown)",
        category: "Marine Fish",
        isEstimated: 1,
      },
      "food-029": {
        code: "C033",
        name: "Spinach",
        serving: "1 cup (100g)",
        category: "Green Leafy Vegetables",
      },
      "food-030": {
        code: "D075",
        name: "Tomato",
        serving: "1 medium (100g)",
        category: "Other Vegetables",
      },
      "food-031": {
        code: "D043",
        name: "Cucumber",
        serving: "1 cup (100g)",
        category: "Other Vegetables",
      },
      "food-032": {
        code: "F002",
        name: "Carrot",
        serving: "1 medium (100g)",
        category: "Roots and Tubers",
      },
      "food-033": {
        code: "F013",
        name: "Sweet Potato",
        serving: "1 medium (100g)",
        category: "Roots and Tubers",
      },
      "food-034": {
        code: "A009",
        name: "Quinoa",
        serving: "1 cup (185g raw; values for raw food, cooked weight unknown)",
        category: "Cereals and Millets",
        isEstimated: 1,
      },
    };

    // Exact name mapping for every code used across recipes and direct mappings
    const EXACT_INGREDIENT_NAMES: Record<string, string> = {
      // Recipe ingredients
      "B010": "Green gram, dal",
      "T012": "Sunflower oil",
      "T013": "Ghee",
      "D075": "Tomato, ripe, hybrid",
      "G017": "Onion, big",
      "A019": "Wheat flour, atta",
      "A014": "Rice, parboiled, milled",
      "B003": "Black gram, dal",
      "A010": "Ragi",
      "B021": "Red gram, dal",
      "D046": "Drumstick",
      "L003": "Paneer",
      "L002": "Milk, whole, Cow",
      "A013": "Rice, raw, brown",
      "A022": "Wheat, semolina",
      "F002": "Carrot, orange",
      "A011": "Rice, flakes",
      "H012": "Ground nut",
      "B011": "Green gram, whole",
      "C033": "Spinach",
      "B020": "Rajmah, red",
      "B002": "Bengal gram, whole",

      // Direct mapped whole foods
      "E001": "Apple, big",
      "E012": "Banana, ripe, robusta",
      "E036": "Mango, ripe, banganapalli",
      "E047": "Orange, pulp",
      "E049": "Papaya, ripe",
      "E028": "Guava, white flesh",
      "H001": "Almond",
      "H021": "Walnut",
      "M004": "Egg, poultry, whole, boiled",
      "N003": "Chicken, poultry, breast, skinless",
      "P068": "Salmon",
      "D043": "Cucumber, green, elongate",
      "F013": "Sweet potato, brown skin",
      "A009": "Quinoa",
    };

    // Assert that each ingredient code's database name EXACTLY matches the expected ingredient name
    for (const [id, rec] of Object.entries(recipes)) {
      for (const ing of rec.ing) {
        const row = rows.find((r) => r[colIdx.code] === ing.code);
        if (!row) {
          throw new Error(
            `Assertion Error: Recipe ${id} (${rec.name}) references missing code ${ing.code}`,
          );
        }
        const actualName = row[colIdx.name];
        const expected = EXACT_INGREDIENT_NAMES[ing.code];
        if (actualName !== expected) {
          throw new Error(
            `Exact Match Assertion Error: Code ${ing.code} used in "${rec.name}" expected exact name "${expected}", but database has "${actualName}"`,
          );
        }
      }
    }

    for (const [id, dm] of Object.entries(directMappings)) {
      const row = rows.find((r) => r[colIdx.code] === dm.code);
      if (!row) {
        throw new Error(
          `Assertion Error: Direct mapping ${id} (${dm.name}) references missing code ${dm.code}`,
        );
      }
      const actualName = row[colIdx.name];
      const expected = EXACT_INGREDIENT_NAMES[dm.code];
      if (actualName !== expected) {
        throw new Error(
          `Exact Match Assertion Error: Direct code ${dm.code} used in "${dm.name}" expected exact name "${expected}", but database has "${actualName}"`,
        );
      }
    }

    let computedRecipeCount = 0;
    let nullCount = 0;

    // Load all legacy food IDs
    const legacyPath = path.resolve("server/data/legacy/foods.json");
    if (fs.existsSync(legacyPath)) {
      const legacyFoods = JSON.parse(fs.readFileSync(legacyPath, "utf8"));
      for (const item of legacyFoods) {
        if (recipes[item.id]) {
          const rec = recipes[item.id];
          const nut = computeRecipe(rec.ing);

          // Automatic sanity check: fail import if calories differ from 4*P + 4*C + 9*F by more than 10%
          const atwater = 4 * nut.proteinG + 4 * nut.carbsG + 9 * nut.fatG;
          const diff = Math.abs(nut.calories - atwater);
          const percentDiff = (diff / atwater) * 100;
          if (percentDiff > 10) {
            throw new Error(
              `Atwater Sanity Check Failed for recipe "${rec.name}" (${item.id}): Calories (${nut.calories}) differ from 4*P + 4*C + 9*F (${atwater.toFixed(1)}) by ${percentDiff.toFixed(2)}%, exceeding 10% tolerance!`,
            );
          }

          insertStmt.run(
            item.id,
            rec.name,
            rec.category,
            rec.serving,
            nut.calories,
            nut.proteinG,
            nut.carbsG,
            nut.fatG,
            nut.fiberG,
            null, // sodium is strictly NULL for estimated recipes because table salt is excluded
            nut.sugarG,
            nut.potassiumMg,
            nut.phosphorusMg,
            null,
            null,
            "IFCT_RECIPE_ESTIMATE",
            1, // marked as estimated composite recipe
          );
          computedRecipeCount++;
        } else if (directMappings[item.id]) {
          const dm = directMappings[item.id];
          const baseNut = ifctNutrients.get(dm.code);
          const gramsMatch = dm.serving.match(/(\d+(?:\.\d+)?)\s*g/i);
          const ratio = gramsMatch ? parseFloat(gramsMatch[1]) / 100 : 1.0;
          if (baseNut) {
            insertStmt.run(
              item.id,
              dm.name,
              dm.category,
              dm.serving,
              Math.round(baseNut.calories * ratio * 10) / 10,
              Math.round(baseNut.proteinG * ratio * 10) / 10,
              Math.round(baseNut.carbsG * ratio * 10) / 10,
              Math.round(baseNut.fatG * ratio * 10) / 10,
              Math.round(baseNut.fiberG * ratio * 10) / 10,
              Math.round(baseNut.sodiumMg * ratio * 10) / 10,
              Math.round(baseNut.sugarG * ratio * 10) / 10,
              baseNut.potassiumMg ? Math.round(baseNut.potassiumMg * ratio * 10) / 10 : null,
              baseNut.phosphorusMg ? Math.round(baseNut.phosphorusMg * ratio * 10) / 10 : null,
              null,
              null,
              "IFCT2017",
              dm.isEstimated ? 1 : 0,
            );
            computedRecipeCount++;
          }
        } else {
          // For all other legacy items with no real IFCT mapping: SET ALL NUTRIENT NUMBERS TO NULL!
          insertStmt.run(
            item.id,
            item.name,
            item.category || "Unverified Food",
            item.servingSize || "1 serving",
            null, // calories NULL
            null, // proteinG NULL
            null, // carbsG NULL
            null, // fatG NULL
            null, // fiberG NULL
            null, // sodiumMg NULL
            null, // sugarG NULL
            null, // potassiumMg NULL
            null, // phosphorusMg NULL
            null, // glycemicIndex NULL
            null, // safeForConditions NULL
            "LEGACY_UNVERIFIED",
            1, // unmeasured
          );
          nullCount++;
        }
      }
    }

    db.exec("COMMIT;");
    console.log(`Successfully imported ${ifctCount} IFCT 2017 foods.`);
    console.log(`Computed ${computedRecipeCount} care-plan dishes from real IFCT ingredient ratios.`);
    console.log(`Set ${nullCount} unverified legacy food items to strict NULL nutrient values.`);

    const totalFoods = db
      .prepare("SELECT COUNT(*) n FROM foods")
      .get() as any;
    console.log(`Total rows in foods table: ${totalFoods.n}`);

    const bySource = db
      .prepare("SELECT source, isEstimated, COUNT(*) cnt FROM foods GROUP BY source, isEstimated")
      .all();
    console.log("Foods breakdown by source:", bySource);
  } catch (err) {
    db.exec("ROLLBACK;");
    throw err;
  }
}

importIfct();
