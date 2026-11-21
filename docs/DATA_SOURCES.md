# Data sources and safety

Nutronics starts offline with deterministic, locally generated demo datasets in `server/data/`. Food nutrient values and medicine examples are synthetic and intended for software demonstration; they are not a clinical reference. Condition summaries are general educational notes informed by public WHO, ADA, AHA, and ICMR-NIN guidance. They do not replace a clinician’s individualized plan. The app displays this disclaimer on clinical and nutrition views: **General guidance, not a substitute for professional medical advice.**

The live product starts from deterministic, locally generated demo datasets in `server/data/`; those values are synthetic and must not be presented as sourced clinical facts. Optional lookups query external services and use the Postgres cache and local fallback:

- `// DATA-SOURCE: USDA FoodData Central https://api.nal.usda.gov/fdc/v1/foods/search (DEMO_KEY)`
- `// DATA-SOURCE: Open Food Facts https://world.openfoodfacts.org/cgi/search.pl`
- `// DATA-SOURCE: NLM RxNav https://rxnav.nlm.nih.gov/REST/drugs.json`
- `// DATA-SOURCE: openFDA Drug Labels https://api.fda.gov/drug/label.json`
- `// DATA-SOURCE: MedlinePlus Connect https://connect.medlineplus.gov/service`

External results are best-effort; use approved clinical sources and clinician review before relying on a recommendation. Open Food Facts and the public APIs may be unavailable offline.
