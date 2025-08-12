

import { GoogleGenAI, Type } from "@google/genai";

export const generateThemes = async (
  month: string,
  year: number,
  pastThemes: string[],
  numThemes: number
): Promise<string[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const themesToAvoid = [...new Set(pastThemes)].join(', ') || 'None';

    const prompt = `You are a master wordsmith and creative strategist for Toastmasters International. Your specialty is crafting Table Topics themes that are not just clever, but are powerful engines for generating fascinating impromptu speeches.

**Your Core Mission:**
Generate **${numThemes}** exceptional, unique meeting themes for **${month} ${year}**.

**The 'Question-Rich' Litmus Test (MANDATORY):**
Before you finalize a theme, you MUST ensure it can easily spark at least 5 *conceptually different* types of questions. For example:
*   A personal story question ("Tell us about a time you...")
*   A hypothetical choice question ("If you had to choose between X and Y...")
*   An opinion question ("What is your take on the idea of...")
*   An advice question ("What advice would you give someone facing...")
*   A creative interpretation question ("What does the phrase '...' mean to you in the context of your career?")
If a theme cannot pass this test, it is a FAILURE. Discard it and try again.

**Blueprint for an A+ Theme:**
1.  **Verb-Driven & Dynamic:** Great themes often contain an action, a challenge, or a dilemma. They feel active, not passive. Examples: "Burning the Bridges," "Reading Between the Lines," "Chasing the Horizon."
2.  **Intriguing Metaphors:** They are built on powerful metaphors that have multiple layers of meaning. "The Tipping Point" is far better than "Making a Big Decision."
3.  **Concise Power:** 1-4 words. The ideal length varies; strive for a mix of lengths for variety. Title Case.
4.  **Universally Relatable:** Anyone from any background should be able to connect with the theme on some level.
5.  **Strictly Unique:** Absolutely no repeats or close variations of the "Previously Used" themes. Conceptual overlap is also forbidden.
6.  **Seasonally Subtle:** The themes should feel appropriate for **${month}** but MUST NOT be literal interpretations of the season or holidays. The connection should be a subtle feeling, not a direct statement.

**Hall of Shame: LOW-QUALITY Themes to AVOID AT ALL COSTS:**
*   **The Vague & Poetic:** "Golden Hour Glow," "Whispers Of Change," "Echoes Of Summer," "Late Bloom's Promise." These sound nice but are too passive and make it hard to generate concrete questions. They lack tension and action.
*   **The Literal & Boring:** "The Beach," "My Favorite Holiday," "Autumn Colors." These are topics, not themes. They lead to one-dimensional answers.
*   **The Corporate & Cliché:** "Teamwork," "Synergy," "Thinking Outside the Box." Soulless and uninspiring.

**Previously used themes — DO NOT REPEAT OR VARY FROM THESE:**
${themesToAvoid}

Now, applying this rigorous standard, generate the themes.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    themes: {
                        type: Type.ARRAY,
                        description: `An array of ${numThemes} unique, evocative, and question-rich theme strings (1-4 words each).`,
                        items: {
                            type: Type.STRING,
                            description: 'A single, short, and thought-provoking theme that is verb-driven or a strong metaphor.'
                        }
                    }
                },
                required: ["themes"]
            }
        }
    });

    const jsonString = response.text;
    const result = JSON.parse(jsonString);

    if (result.themes && Array.isArray(result.themes)) {
        return result.themes;
    } else {
        throw new Error("Invalid response format from Gemini API");
    }
  } catch(error) {
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
};