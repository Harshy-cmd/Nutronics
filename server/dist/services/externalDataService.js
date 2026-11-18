import { db } from '../db/schema.js';
const timeout = (ms) => AbortSignal.timeout(ms);
async function cachedFetch(key, url, fallback) { const row = db.prepare('SELECT value,expires_at FROM cache WHERE key=?').get(key); if (row && row.expires_at > Date.now())
    return JSON.parse(row.value); try {
    const response = await fetch(url, { signal: timeout(3000) });
    if (!response.ok)
        throw new Error('External source unavailable');
    const value = await response.json();
    db.prepare('INSERT OR REPLACE INTO cache(key,value,expires_at) VALUES(?,?,?)').run(key, JSON.stringify(value), Date.now() + 3600000);
    return value;
}
catch {
    return fallback;
} }
// DATA-SOURCE: USDA FoodData Central https://api.nal.usda.gov/fdc/v1/foods/search (DEMO_KEY)
export const usdaLookup = (query, fallback) => cachedFetch(`usda:${query}`, `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&api_key=DEMO_KEY`, fallback);
// DATA-SOURCE: Open Food Facts https://world.openfoodfacts.org/cgi/search.pl
export const openFoodFactsLookup = (query, fallback) => cachedFetch(`off:${query}`, `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=5`, fallback);
// DATA-SOURCE: NLM RxNav https://rxnav.nlm.nih.gov/REST/drugs.json
export const rxNavLookup = (query, fallback) => cachedFetch(`rx:${query}`, `https://rxnav.nlm.nih.gov/REST/drugs.json?name=${encodeURIComponent(query)}`, fallback);
// DATA-SOURCE: openFDA Drug Labels https://api.fda.gov/drug/label.json
export const fdaLookup = (query, fallback) => cachedFetch(`fda:${query}`, `https://api.fda.gov/drug/label.json?search=openfda.generic_name:${encodeURIComponent(query)}&limit=1`, fallback);
// DATA-SOURCE: MedlinePlus Connect https://connect.medlineplus.gov/service
export const medlineLookup = (query, fallback) => cachedFetch(`medline:${query}`, `https://connect.medlineplus.gov/service?mainSearchCriteria.v.cs=2.16.840.1.113663.6.69&mainSearchCriteria.v.dn=${encodeURIComponent(query)}&informationRecipient.languageCode.c=en&knowledgeResponseType=application/json`, fallback);
