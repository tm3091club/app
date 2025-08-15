import { GoogleGenAI, Type } from "@google/genai";

export async function generateThemes(
  month: string,
  year: number,
  previousThemes: string[],
  numThemes: number
): Promise<string[]> {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("The Gemini API key is invalid or missing. Please check your app's environment configuration.");
    }

    const ai = new GoogleGenAI({ apiKey });

    const prior = normalizeThemeList(previousThemes);
    const maxTries = 2; // retries rarely needed now
    let chosen: string[] = [];

    for (let attempt = 0; attempt < maxTries && chosen.length < numThemes; attempt++) {
      const prompt = buildPrompt({ numThemes, month, year, inspiration: prior });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              themes: {
                type: Type.ARRAY,
                description: `An array of ${numThemes} short, evocative, question-rich themes (1–3 words each).`,
                items: {
                  type: Type.STRING,
                  description: "A single, 1–3 word, Title Case, verb-driven theme or strong metaphor."
                }
              }
            },
            required: ["themes"]
          }
        },
        generationConfig: {
          temperature: 0.85,
          topK: 32,
          topP: 0.95
        }
      });

      // Parse the JSON text returned by the model
      const jsonString = response.text;
      let raw: string[] = [];
      try {
        const parsed = JSON.parse(jsonString);
        if (parsed && Array.isArray(parsed.themes)) {
          raw = parsed.themes;
        }
      } catch (parseError) {
        console.error('Failed to parse Gemini response:', parseError, 'Raw response:', jsonString);
        raw = [];
      }

    const cleaned = dedupeCaseInsensitive(
      raw
        .map(toTitleCase)
        .map(stripMostPunctuation)
        .map(collapseSpaces)
        .filter(isLengthOk1to3)
        // Only block exact or trivial variants of prior themes
        .filter(t => !isExactOrTrivialVariant(t, prior))
    );

    for (const t of cleaned) {
      if (chosen.length >= numThemes) break;
      if (!chosen.map(x => x.toLowerCase()).includes(t.toLowerCase())) {
        chosen.push(t);
      }
    }
  }

    const final = chosen.slice(0, numThemes);
    if (final.length < numThemes) {
      throw new Error(`Got ${final.length}/${numThemes} valid themes. Try again or loosen constraints.`);
    }
    return final;
  } catch (error) {
    console.error("Error generating themes with Gemini:", error);
    if (error instanceof Error) {
      if (error.message.toLowerCase().includes('api key')) {
        throw new Error("The Gemini API key is invalid or missing. Please check your app's environment configuration.");
      }
      // Provide a more descriptive error message to the user.
      throw new Error(`Failed to generate themes. The AI service returned an error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while generating themes. Please try again later.");
  }
}

/* ---------------------------------- Prompt --------------------------------- */

function buildPrompt(opts: {
  numThemes: number;
  month: string;
  year: number;
  inspiration: string[];
}) {
  const { numThemes, month, year, inspiration } = opts;

  // Key changes vs your original:
  // - No banned seasonal/holiday words.
  // - Explicit 1–3 words.
  // - Inspiration bank: “build on the energy,” don’t copy titles.
  return `
You are a master wordsmith and creative strategist for Toastmasters International.
Specialty: crafting Table Topics themes that ignite fascinating impromptu speeches.

Generate exactly ${numThemes} exceptional, unique meeting themes for ${month} ${year}.

— Mandatory Quality Bar —
1) Question-Rich: each theme should naturally spark at least 5 different question types
   (personal story, hypothetical, opinion, advice, creative interpretation).
2) Verb-Driven or Strong Metaphor: active, energetic, or layered.
3) Concise: 1–3 words. Title Case. No emojis. No filler words.
4) Universally Relatable.
5) Keep it fresh: do not reuse any title from the Inspiration Bank below verbatim.

Seasonal notes: You MAY use seasonal or cultural words if they serve the idea,
but keep the wording crisp and not on-the-nose. Avoid long phrases.

— Inspiration Bank (do NOT copy these titles verbatim; build on the *energy* instead) —
${inspiration.map(t => `- ${t}`).join("\n")}

Return ONLY valid JSON: { "themes": string[] }.
Each string must be 1–3 words in Title Case.
`;
}

/* --------------------------- Validation utilities --------------------------- */

function normalizeThemeList(list: string[]): string[] {
  return dedupeCaseInsensitive(
    list
      .flatMap(s => s.split(/[\,\t\n/]+/g))
      .map(s => s.trim())
      .filter(Boolean)
  );
}

function toTitleCase(s: string) {
  return s
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

function stripMostPunctuation(s: string) {
  // keep hyphens if they help brevity (e.g., “Cross-Training”), drop the rest
  return s.replace(/[“”"’'–—:;!\?\.,()*[\]{}]/g, "").trim();
}

function collapseSpaces(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

function isLengthOk1to3(s: string) {
  const words = s.split(/\s+/).filter(Boolean);
  return words.length >= 1 && words.length <= 3 && s.length <= 28; // guard against very long words
}

function dedupeCaseInsensitive(list: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    const key = item.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

/** Blocks exact duplicates and trivial variants like “The Beach” vs “Beach”, or simple pluralization. */
function isExactOrTrivialVariant(candidate: string, priorList: string[]) {
  const cKey = trivialKey(candidate);
  for (const p of priorList) {
    if (trivialKey(p) === cKey) return true;
  }
  return false;
}

function trivialKey(s: string) {
  // lower, strip punctuation, remove leading articles, collapse spaces, simple de-plural
  const cleaned = s
    .toLowerCase()
    .replace(/[“”"’'–—:;!\?\.,()*[\]{}]/g, "")
    .replace(/^\s*(the|a|an)\s+/, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = cleaned.split(" ").map(w => depluralize(w));
  return words.join(" ");
}

function depluralize(w: string) {
  // ultra-simple: “games” → “game”, “stories” → “story”; leave short words alone
  if (w.length > 3 && w.endsWith("s")) return w.slice(0, -1);
  return w;
}

/* ----------------------------- Safe JSON reader ---------------------------- */

function safeRead<T>(obj: any, path: (string | number)[]): T | null {
  try {
    let cur = obj;
    for (const key of path) cur = (cur as any)[key as any];
    return (cur as T) ?? null;
  } catch {
    return null;
  }
}