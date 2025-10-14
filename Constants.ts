/**
 * Color mapping for key roles for schedule highlighting (light, accessible, print-friendly)
 */
export const ROLE_HIGHLIGHT_COLORS: { [role: string]: string } = {
  'Toastmaster': '#dbeafe', // Light Blue
  'Table Topics Master': '#d1fae5', // Light Green
  'Speaker 1': '#fef9c3', // Light Yellow
  'Speaker 2': '#fef9c3',
  'Speaker 3': '#fef9c3',
  'General Evaluator': '#ede9fe', // Light Purple
  'Evaluator 1': '#ffedd5', // Light Orange
  'Evaluator 2': '#ffedd5',
  'Evaluator 3': '#ffedd5',
  'Inspiration Award': '#fce7f3', // Light Pink
};



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
  'Ballot Counter',
  'Ah-Counter',
  'Table Topics Master',
  'Speaker 1',
  'Speaker 2',
  'Speaker 3',
  'General Evaluator',
  'Evaluator 1',
  'Evaluator 2',
  'Evaluator 3',
  'Inspiration Award',
];

/**
 * Minor roles: typically require less experience or are supporting roles.
 * Used in scheduling logic to prioritize assignment order and qualification checks.
 * Note: Inspiration Award is restricted to Past Presidents only but is not a major role.
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
  'Inspiration Award',
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
];

/**
 * Support email address for bug reports
 * TODO: Change this to your actual support email address
 */
export const BUG_REPORT_EMAIL = 'tmprofessionallyspeaking@gmail.com';

