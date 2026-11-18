import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";
const dir = config.dataPath;
fs.mkdirSync(dir, { recursive: true });
const staples = [
  "Moong Dal Tadka",
  "Whole Wheat Roti",
  "Steamed Idli",
  "Ragi Dosa",
  "Vegetable Sambar",
  "Paneer Tikka",
  "Brown Rice",
  "Upma",
  "Khichdi",
  "Poha",
  "Curd",
  "Sprouts",
  "Oats",
  "Palak Paneer",
  "Rajma",
  "Chole",
  "Apple",
  "Banana",
  "Mango",
  "Orange",
  "Papaya",
  "Guava",
  "Almonds",
  "Walnuts",
  "Boiled Egg",
  "Grilled Chicken",
  "Salmon",
  "Broccoli",
  "Spinach",
  "Tomato",
  "Cucumber",
  "Carrot",
  "Sweet Potato",
  "Quinoa",
  "Greek Yogurt",
  "Lentil Soup",
  "Tofu",
  "Avocado",
  "Whole Grain Bread",
  "Corn",
];
const foods = Array.from({ length: 160 }, (_, i) => {
  const base = staples[i % staples.length];
  const name =
    i < staples.length
      ? base
      : `${base} (${Math.floor(i / staples.length) + 1})`;
  const calories = 55 + ((i * 37) % 420);
  return {
    id: `food-${String(i + 1).padStart(3, "0")}`,
    name,
    category: ["Grains", "Vegetables", "Fruit", "Protein", "Dairy"][i % 5],
    servingSize:
      i % 3 === 0 ? "1 cup" : i % 3 === 1 ? "1 medium serving" : "100 g",
    calories,
    proteinG: +(2 + ((i * 7) % 28)).toFixed(1),
    carbsG: +(6 + ((i * 11) % 65)).toFixed(1),
    fatG: +(1 + ((i * 3) % 22)).toFixed(1),
    fiberG: +(1 + ((i * 5) % 14)).toFixed(1),
    sodiumMg: 20 + ((i * 73) % 900),
    sugarG: (i * 3) % 24,
    potassiumMg: 80 + ((i * 97) % 850),
    glycemicIndex: ["LOW", "MEDIUM", "HIGH"][i % 3],
    safeForConditions:
      i % 5 === 0
        ? ["HYPERTENSION", "HEART_DISEASE"]
        : ["DIABETES", "HYPERTENSION", "OBESITY"],
  };
});
const medicines = [
  "Metformin",
  "Amlodipine",
  "Losartan",
  "Atorvastatin",
  "Glimepiride",
  "Telmisartan",
  "Aspirin",
  "Furosemide",
  "Pantoprazole",
  "Levothyroxine",
  "Empagliflozin",
  "Insulin glargine",
  "Bisoprolol",
  "Clopidogrel",
  "Ramipril",
  "Lisinopril",
  "Hydrochlorothiazide",
  "Carvedilol",
  "Warfarin",
  "Omeprazole",
  "Vitamin D3",
  "Calcium carbonate",
  "Spironolactone",
  "Gabapentin",
  "Paracetamol",
].map((genericName, i) => ({
  id: `med-${i + 1}`,
  genericName,
  drugClass: [
    "Antidiabetic",
    "Antihypertensive",
    "Statin",
    "Antiplatelet",
    "Diuretic",
  ][i % 5],
  timingInstruction: [
    "Take with meals as prescribed",
    "Take at the same time daily as prescribed",
    "Follow your clinician’s exact timing",
  ][i % 3],
  foodInteractionNote:
    "Ask your pharmacist or doctor about food interactions for your specific prescription.",
  warningSigns:
    "Seek urgent care for severe allergy, fainting, breathing difficulty, or unusual bleeding.",
}));
const guidelines = [
  {
    condition: "DIABETES",
    maxSugarGPerMeal: 10,
    maxSodiumMgPerDay: 2000,
    maxCaloriesPerDay: 2000,
    minFiberGPerDay: 25,
    allowedFoodsNote:
      "Prefer high-fiber vegetables, pulses, and minimally processed whole grains.",
    avoidFoodsNote: "Limit sugar-sweetened drinks and highly refined sweets.",
    rulesList: [
      "Pair carbohydrate foods with protein and fiber.",
      "Personalize carbohydrate targets with your care team.",
    ],
  },
  {
    condition: "HYPERTENSION",
    maxSugarGPerMeal: 10,
    maxSodiumMgPerDay: 1500,
    maxCaloriesPerDay: 2000,
    minFiberGPerDay: 25,
    allowedFoodsNote:
      "Choose fresh foods and a variety of fruits and vegetables.",
    avoidFoodsNote: "Limit salty packaged foods, pickles, and instant meals.",
    rulesList: [
      "Read sodium labels and compare serving sizes.",
      "Do not change blood pressure medicines without clinical advice.",
    ],
  },
  {
    condition: "CKD",
    maxSugarGPerMeal: 10,
    maxSodiumMgPerDay: 2000,
    maxCaloriesPerDay: 2000,
    minFiberGPerDay: 25,
    allowedFoodsNote:
      "Kidney diets vary by lab results and stage; confirm portions with a renal dietitian.",
    avoidFoodsNote:
      "Potassium, phosphorus, fluid, and protein limits are individualized.",
    rulesList: [
      "Check potassium and phosphorus guidance with your renal team.",
      "Do not use salt substitutes unless approved.",
    ],
  },
  {
    condition: "HEART_DISEASE",
    maxSugarGPerMeal: 10,
    maxSodiumMgPerDay: 2000,
    maxCaloriesPerDay: 2000,
    minFiberGPerDay: 25,
    allowedFoodsNote:
      "Favor vegetables, legumes, whole grains, and unsaturated fats.",
    avoidFoodsNote: "Limit excess sodium and highly processed foods.",
    rulesList: [
      "Follow your prescribed fluid and sodium targets.",
      "Report new chest pain or breathlessness urgently.",
    ],
  },
  {
    condition: "OBESITY",
    maxSugarGPerMeal: 10,
    maxSodiumMgPerDay: 2300,
    maxCaloriesPerDay: 1800,
    minFiberGPerDay: 25,
    allowedFoodsNote:
      "Build balanced meals around vegetables, fiber, and adequate protein.",
    avoidFoodsNote:
      "Limit sugary drinks and energy-dense ultra-processed foods.",
    rulesList: [
      "Use sustainable goals agreed with your care team.",
      "Avoid crash diets and unprescribed supplements.",
    ],
  },
];
for (const [name, data] of Object.entries({ foods, medicines, guidelines }))
  fs.writeFileSync(
    path.join(dir, `${name}.json`),
    JSON.stringify(data, null, 2),
  );
console.log(
  `Generated ${foods.length} foods, ${medicines.length} medicines, ${guidelines.length} guidelines.`,
);
