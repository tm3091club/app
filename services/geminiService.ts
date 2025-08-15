import { getFunctions, httpsCallable } from 'firebase/functions';

// Development fallback for CORS issues
async function generateThemesClientSide(
  month: string,
  year: number,
  previousThemes: string[],
  numThemes: number
): Promise<string[]> {
  // Generate simple themes for development
  const themes = [];
  const adjectives = ['Bold', 'Bright', 'Creative', 'Dynamic', 'Inspiring', 'Powerful', 'Vibrant', 'Mindful'];
  const nouns = ['Journeys', 'Horizons', 'Paths', 'Moments', 'Visions', 'Connections', 'Bridges', 'Foundations'];
  
  for (let i = 0; i < numThemes; i++) {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    themes.push(`${adj} ${noun}`);
  }
  
  return themes;
}

export async function generateThemes(
  month: string,
  year: number,
  previousThemes: string[],
  numThemes: number
): Promise<string[]> {
  // For local development, use client-side fallback to avoid CORS issues
  if (window.location.hostname === 'localhost') {
    return await generateThemesClientSide(month, year, previousThemes, numThemes);
  }
  
  try {
    const functions = getFunctions();
    const generateThemesFunction = httpsCallable(functions, 'generateThemes');
    
    const result = await generateThemesFunction({
      month,
      year,
      previousThemes,
      numThemes
    });

    const data = result.data as { themes: string[] };
    
    if (!data || !Array.isArray(data.themes)) {
      throw new Error("Invalid response format from theme generation service");
    }
    
    return data.themes;
    
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('failed-precondition')) {
        throw new Error("The Gemini API key is not configured on the server. Please contact your administrator.");
      }
      if (error.message.includes('invalid-argument')) {
        throw new Error("Invalid parameters provided for theme generation.");
      }
      throw new Error(`Failed to generate themes: ${error.message}`);
    }
    
    throw new Error("An unknown error occurred while generating themes. Please try again later.");
  }
}