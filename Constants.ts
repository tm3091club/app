


/**
 * All Toastmasters roles that appear on the monthly schedule.
 * This list is the source of truth for all role assignments.
 */
export const TOASTMASTERS_ROLES = [
  'President',
  'Pledge',
  'Thought of the Day',
  'Toastmaster',
  'Grammarian',
  'Timekeeper',
  'Ah-Counter',
  'Ballot Counter',
  'Table Topics Master',
  'Evaluator 1',
  'Speaker 1',
  'Evaluator 2',
  'Speaker 2',
  'Evaluator 3',
  'Speaker 3',
  'General Evaluator',
  'Inspiration Award',
];

/**
 * Minor roles: typically require less experience or are supporting roles.
 * Used in scheduling logic to prioritize assignment order and qualification checks.
 */
export const MINOR_ROLES = [
  'Pledge',
  'Thought of the Day',
  'Grammarian',
  'Timekeeper',
  'Ah-Counter',
  'Ballot Counter',
  'Evaluator 1',
  'Evaluator 2',
  'Evaluator 3',
];

/**
 * Major roles: require more experience, leadership, or are key to the meeting.
 * Used in scheduling logic to prioritize assignment order and qualification checks.
 * Note: 'President' is a major role and, if unavailable, is filled by Vice President Education.
 */
export const MAJOR_ROLES = [
  'President',
  'Toastmaster',
  'Table Topics Master',
  'General Evaluator',
  'Speaker 1',
  'Speaker 2',
  'Speaker 3',
  'Inspiration Award',
];

