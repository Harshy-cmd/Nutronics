import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";
// In-memory cache loaded once at startup
export const foods = JSON.parse(fs.readFileSync(path.resolve(config.dataPath, "foods.json"), "utf8"));
export const medicines = JSON.parse(fs.readFileSync(path.resolve(config.dataPath, "medicines.json"), "utf8"));
const guidelinesPath = path.resolve(config.dataPath, "guidelines.json");
export const staticGuidelines = fs.existsSync(guidelinesPath)
    ? JSON.parse(fs.readFileSync(guidelinesPath, "utf8"))
    : [];
