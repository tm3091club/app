import { getFunctions, httpsCallable } from 'firebase/functions';

// Development fallback for CORS issues
async function generateThemesClientSide(
  month: string,
  year: number,
  previousThemes: string[],
  numThemes: number
): Promise<string[]> {
  // Create concrete, relatable themes based on month, season, and current events
  const monthNumber = new Date(`${month} 1, ${year}`).getMonth(); // 0-11
  
  // Season-based themes
  const seasonalThemes: { [key: number]: string[] } = {
    // Winter (Dec, Jan, Feb)
    0: ['New Beginnings', 'Fresh Starts', 'Winter Reflections', 'Goal Setting', 'Resolutions in Action', 'Planning Ahead'],
    1: ['Love and Friendship', 'Acts of Kindness', 'Building Connections', 'Appreciation', 'Heart to Heart', 'Caring Communities'],
    11: ['Holiday Traditions', 'Year-end Reflections', 'Giving Back', 'Family Values', 'Winter Celebrations', 'Gratitude'],
    
    // Spring (Mar, Apr, May) 
    2: ['Spring Awakening', 'Growth and Renewal', 'Fresh Perspectives', 'March Madness', 'Breaking Through', 'New Opportunities'],
    3: ['Spring Forward', 'April Showers', 'Easter Joy', 'Renewal', 'Blooming Ideas', 'Earth Day'],
    4: ['May Flowers', 'Mothers Day', 'Memorial Day', 'Growing Strong', 'Spring Cleaning', 'Graduation Season'],
    
    // Summer (Jun, Jul, Aug)
    5: ['Summer Adventures', 'Fathers Day', 'Graduation', 'Wedding Season', 'Outdoor Fun', 'Vacation Vibes'],
    6: ['Independence Day', 'Freedom', 'Red White and Blue', 'Summer Fun', 'Fireworks', 'All American'],
    7: ['Summer Heat', 'Vacation Time', 'Back to School Prep', 'Dog Days', 'Summer Harvest', 'Family Reunions'],
    
    // Fall (Sep, Oct, Nov)
    8: ['Back to School', 'New Chapters', 'Labor Day', 'Autumn Arrives', 'Harvesting Success', 'Learning Season'],
    9: ['Halloween Fun', 'Autumn Leaves', 'Harvest Time', 'Spooky Stories', 'Fall Colors', 'Thanksgiving Prep'],
    10: ['Thanksgiving', 'Gratitude', 'Family Gatherings', 'Giving Thanks', 'Autumn Harvest', 'Veterans Day']
  };
  
  // General interesting themes that work year-round
  const generalThemes = [
    'Around the World', 'Time Travel', 'Superheroes', 'Food Adventures', 'Music and Memories',
    'Life Lessons', 'Childhood Dreams', 'Future Vision', 'Success Stories', 'Overcoming Challenges',
    'Technology Today', 'Simple Pleasures', 'Hidden Talents', 'Life Changes', 'Mentor Moments',
    'Cultural Celebrations', 'Bucket List', 'Pet Stories', 'Road Trip Adventures', 'Hobby Heaven',
    'Career Journeys', 'Hometown Pride', 'Cooking Adventures', 'Book Club', 'Movie Magic',
    'Sports and Games', 'Weather Wonders', 'Transportation', 'Colors and Meanings', 'Health and Wellness',
    'Vintage Vibes', 'Modern Marvels', 'Nature Walks', 'Art and Creativity', 'Leadership Lessons',
    'Communication Skills', 'Problem Solving', 'Team Building', 'Public Speaking', 'Confidence Building',
    'Charity and Service', 'Community Impact', 'Environmental Care', 'Innovation Ideas', 'Tradition vs Progress'
  ];
  
  // Get seasonal themes for this month
  let availableThemes = [...(seasonalThemes[monthNumber] || []), ...generalThemes];
  
  // Remove any previously used themes to avoid repetition
  if (previousThemes && previousThemes.length > 0) {
    const previousThemesLower = previousThemes.map(t => t.toLowerCase());
    availableThemes = availableThemes.filter(theme => 
      !previousThemesLower.includes(theme.toLowerCase())
    );
  }
  
  // If we don't have enough unique themes, add back some general ones
  if (availableThemes.length < numThemes) {
    availableThemes = [...availableThemes, ...generalThemes];
  }
  
  // Randomly select themes
  const selectedThemes = [];
  const usedIndices = new Set();
  
  for (let i = 0; i < numThemes && availableThemes.length > 0; i++) {
    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * availableThemes.length);
    } while (usedIndices.has(randomIndex) && usedIndices.size < availableThemes.length);
    
    usedIndices.add(randomIndex);
    selectedThemes.push(availableThemes[randomIndex]);
  }
  
  return selectedThemes;
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