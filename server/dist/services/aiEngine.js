// TODO(ai): swap with a real LLM / recommendation engine
import fs from "node:fs";
import path from "node:path";
import { db } from "../db/schema.js";
export const DISCLAIMER = "General guidance, not a substitute for professional medical advice.";
const foods = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "data/foods.json"), "utf8"));
export function answerFor(userId, question) {
    const user = db
        .prepare("SELECT conditions FROM users WHERE id=?")
        .get(userId);
    const conditions = JSON.parse(user?.conditions || "[]");
    const guidelines = conditions
        .map((c) => db
        .prepare("SELECT data FROM guidelines WHERE condition=?")
        .get(c))
        .filter(Boolean)
        .map((r) => JSON.parse(r.data));
    const low = question.toLowerCase();
    const food = foods.find((f) => low.includes(f.name.toLowerCase()));
    const safe = food
        ? conditions.every((c) => food.safeForConditions.includes(c) || c === "CKD")
        : false;
    let answer;
    let status;
    let alternatives = [];
    if (food) {
        answer = safe
            ? `${food.name} may fit your general condition-aware food guidance in a suitable portion. Its serving has ${food.calories} kcal, ${food.carbsG} g carbohydrates, ${food.sodiumMg} mg sodium, and ${food.fiberG} g fiber. Follow your personal meal plan.`
            : `${food.name} needs a portion-specific review for your active conditions. Consider discussing it with your clinician.`;
        status = safe ? "VERIFIED" : "PENDING";
        alternatives = foods
            .filter((f) => f.id !== food.id &&
            conditions.every((c) => f.safeForConditions.includes(c)))
            .sort((a, b) => a.sodiumMg - b.sodiumMg)
            .slice(0, 3);
    }
    else if (/when.*take|medicine|metformin/.test(low)) {
        answer =
            "Take medicines exactly as prescribed on your label. Food timing differs by medicine and formulation; check with your pharmacist or prescribing clinician before changing timing.";
        status = "VERIFIED";
    }
    else if (/swap|alternative|breakfast/.test(low)) {
        alternatives = foods
            .filter((f) => conditions.every((c) => f.safeForConditions.includes(c)))
            .sort((a, b) => a.sodiumMg - b.sodiumMg)
            .slice(0, 4);
        answer = `Here are locally available options that match the general rules for ${conditions.join(", ") || "your profile"}. Confirm portions against your care plan.`;
        status = "VERIFIED";
    }
    else {
        answer =
            "I can help check a food, suggest a lower-sodium or lower-sugar swap, or explain medicine and food timing. For symptoms, severe or sudden symptoms need urgent clinical care.";
        status = "PENDING";
    }
    if (guidelines.length)
        answer += ` Your saved care guidance includes: ${guidelines.map((g) => g.allowedFoodsNote).join(" ")}`;
    answer += ` ${DISCLAIMER}`;
    return {
        answer,
        verificationStatus: status,
        food: food || null,
        alternatives,
        conditions,
        disclaimer: DISCLAIMER,
    };
}
