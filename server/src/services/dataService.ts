import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";

export interface FoodItem {
  id: string;
  name: string;
  category: string;
  servingSize: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sodiumMg: number;
  sugarG: number;
  safeForConditions: string[];
}

export interface MedicineItem {
  genericName: string;
  brandNames: string[];
  purpose: string;
  foodTiming: string;
  keyNutrientInteractions: string[];
  contraindications: string[];
  timingInstructions: string;
}

export interface GuidelineItem {
  condition: string;
  maxSugarGPerMeal: number;
  maxSodiumMgPerDay: number;
  maxCaloriesPerDay: number;
  minFiberGPerDay: number;
  allowedFoodsNote: string;
}

// In-memory cache loaded once at startup
export const foods: FoodItem[] = JSON.parse(
  fs.readFileSync(path.resolve(config.dataPath, "foods.json"), "utf8"),
);

export const medicines: MedicineItem[] = JSON.parse(
  fs.readFileSync(path.resolve(config.dataPath, "medicines.json"), "utf8"),
);

const guidelinesPath = path.resolve(config.dataPath, "guidelines.json");
export const staticGuidelines: GuidelineItem[] = fs.existsSync(guidelinesPath)
  ? JSON.parse(fs.readFileSync(guidelinesPath, "utf8"))
  : [];
