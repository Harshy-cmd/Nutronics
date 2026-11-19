import dotenv from "dotenv";
import path from "node:path";
import { db } from "../src/db/schema.js";

dotenv.config({ path: path.resolve(".env") });

const USDA_API_KEY = process.env.USDA_API_KEY;

if (!USDA_API_KEY) {
  console.error("ERROR: USDA_API_KEY is not set in root .env file.");
  process.exit(1);
}

if (USDA_API_KEY === "DEMO_KEY") {
  console.error("ERROR: DEMO_KEY is not allowed. Please provide your real USDA API key.");
  process.exit(1);
}

// Foods missing from IFCT 2017 that are referenced by the app
const USDA_GAP_FOODS = [
  { id: "food-013", query: "Rolled Oats", category: "Cereals and Millets", servingSize: "1 cup cooked (40g dry)" },
  { id: "food-028", query: "Broccoli raw", category: "Green Leafy Vegetables", servingSize: "1 cup (90g)" },
  { id: "food-035", query: "Plain Greek Yogurt", category: "Milk and Milk Products", servingSize: "1 cup (150g)" },
  { id: "usda-001", query: "Tofu, firm", category: "Grain Legumes", servingSize: "100 g" },
  { id: "usda-002", query: "Chia seeds", category: "Nuts and Oil Seeds", servingSize: "1 tbsp (12g)" },
  { id: "usda-003", query: "Flaxseed", category: "Nuts and Oil Seeds", servingSize: "1 tbsp (10g)" },
  { id: "usda-004", query: "Avocado, raw", category: "Fruits", servingSize: "1/2 medium (100g)" },
  { id: "usda-005", query: "Peanut butter, smooth", category: "Nuts and Oil Seeds", servingSize: "2 tbsp (32g)" },
];

interface FdcFoodItem {
  fdcId: number;
  description: string;
  foodNutrients: {
    nutrientId: number;
    nutrientName: string;
    value: number;
    unitName: string;
  }[];
}

async function fetchUsdaFood(query: string): Promise<FdcFoodItem | null> {
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&api_key=${encodeURIComponent(USDA_API_KEY!)}&pageSize=1`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`USDA API error (${res.status} ${res.statusText}): ${await res.text()}`);
  }
  const data = await res.json();
  if (data.foods && data.foods.length > 0) {
    return data.foods[0];
  }
  return null;
}

function extractNutrient(food: FdcFoodItem, ids: number[]): number | null {
  const match = food.foodNutrients.find(n => ids.includes(n.nutrientId));
  return match !== undefined ? Math.round(match.value * 10) / 10 : null;
}

export async function importUsdaGaps() {
  console.log(`Starting USDA gap-filling import for ${USDA_GAP_FOODS.length} items...`);

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

  let count = 0;
  for (const gap of USDA_GAP_FOODS) {
    console.log(`Querying USDA for: "${gap.query}"...`);
    const fdc = await fetchUsdaFood(gap.query);
    if (!fdc) {
      console.warn(`  Warning: No USDA match found for "${gap.query}"`);
      continue;
    }

    // USDA standard nutrient IDs:
    // 1008: Energy (kcal)
    // 1003: Protein (g)
    // 1005: Carbohydrate by difference (g)
    // 1004: Total lipid (fat) (g)
    // 1079: Fiber, total dietary (g)
    // 1093: Sodium, Na (mg)
    // 2000, 1063: Total Sugars (g)
    // 1092: Potassium, K (mg)
    // 1091: Phosphorus, P (mg)
    const cal = extractNutrient(fdc, [1008]);
    const prot = extractNutrient(fdc, [1003]);
    const carbs = extractNutrient(fdc, [1005]);
    const fat = extractNutrient(fdc, [1004]);
    const fiber = extractNutrient(fdc, [1079]);
    const sodium = extractNutrient(fdc, [1093]);
    const sugar = extractNutrient(fdc, [2000, 1063]) ?? 0;
    const potassium = extractNutrient(fdc, [1092]);
    const phosphorus = extractNutrient(fdc, [1091]);

    // Parse serving size ratio relative to 100g USDA standard reference
    const gramsMatch = gap.servingSize.match(/(\d+(?:\.\d+)?)\s*g/i);
    const ratio = gramsMatch ? parseFloat(gramsMatch[1]) / 100 : 1.0;

    insertStmt.run(
      gap.id,
      gap.query,
      gap.category,
      gap.servingSize,
      cal !== null ? Math.round(cal * ratio * 10) / 10 : null,
      prot !== null ? Math.round(prot * ratio * 10) / 10 : null,
      carbs !== null ? Math.round(carbs * ratio * 10) / 10 : null,
      fat !== null ? Math.round(fat * ratio * 10) / 10 : null,
      fiber !== null ? Math.round(fiber * ratio * 10) / 10 : null,
      sodium !== null ? Math.round(sodium * ratio * 10) / 10 : null,
      Math.round(sugar * ratio * 10) / 10,
      potassium !== null ? Math.round(potassium * ratio * 10) / 10 : null,
      phosphorus !== null ? Math.round(phosphorus * ratio * 10) / 10 : null,
      null, // glycemicIndex null per instruction
      null, // safeForConditions null per instruction
      "USDA",
      0, // measured laboratory whole food
    );
    count++;
    console.log(`  Imported ${gap.id} ("${gap.query}"): ${cal !== null ? Math.round(cal * ratio * 10) / 10 : "—"} kcal (FDC ID: ${fdc.fdcId})`);

    // Respect USDA rate limit (max 1000 requests/hour, gentle 500ms throttle)
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`Successfully imported ${count} items from USDA FoodData Central.`);
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}`) {
  importUsdaGaps().catch(e => {
    console.error(e);
    process.exit(1);
  });
}
