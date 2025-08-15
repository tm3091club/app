import { getFunctions, httpsCallable } from 'firebase/functions';

export async function generateThemes(
  month: string,
  year: number,
  previousThemes: string[],
  numThemes: number
): Promise<string[]> {
  try {
    console.log(`Calling Firebase Function to generate ${numThemes} themes for ${month} ${year}`);
    
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
    
    console.log(`Successfully received ${data.themes.length} themes:`, data.themes);
    return data.themes;
    
  } catch (error) {
    console.error("Error calling theme generation function:", error);
    
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