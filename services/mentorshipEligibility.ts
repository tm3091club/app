export interface EligibilityInputs {
  speechesCompleted: number;
  monthsSinceJoin: number;
  attendancePct90: number;
  rolesIn90: number;
  policy: {
    minSpeeches: number;
    minMonths: number;
    minAttendancePct90: number;
    minRoles90: number;
  };
  override?: { eligible: boolean } | null;
}

export type EligibilityResult =
  | { status: 'eligible'; reasons: string[] }
  | { status: 'needs_review'; reasons: string[] }   // close call; VPE decides
  | { status: 'not_eligible'; reasons: string[] }
  | { status: 'override_eligible'; reasons: string[] }
  | { status: 'override_blocked'; reasons: string[] };

export function evaluateMentorEligibility(i: EligibilityInputs): EligibilityResult {
  if (i.override) {
    return i.override.eligible
      ? { status: 'override_eligible', reasons: ['VPE approved via override.'] }
      : { status: 'override_blocked', reasons: ['VPE blocked via override.'] };
  }

  const okSpeeches = i.speechesCompleted >= i.policy.minSpeeches;
  const okMonths = i.monthsSinceJoin >= i.policy.minMonths;
  const okAttendance = i.attendancePct90 >= i.policy.minAttendancePct90;
  const okRoles = i.rolesIn90 >= i.policy.minRoles90;

  const passes = [okSpeeches, okMonths, okAttendance, okRoles].filter(Boolean).length;

  if (okSpeeches && okMonths && okAttendance && okRoles) {
    return { status: 'eligible', reasons: ['Meets all club mentorship criteria.'] };
  }

  // "Close call": let VPE decide when most criteria are met
  if (passes >= 3 && okSpeeches && okMonths) {
    return {
      status: 'needs_review',
      reasons: [
        !okAttendance ? 'Attendance below target.' : '',
        !okRoles ? 'Too few recent roles.' : '',
      ].filter(Boolean),
    };
  }

  return {
    status: 'not_eligible',
    reasons: [
      !okSpeeches ? 'Fewer than 3 Pathways speeches completed.' : '',
      !okMonths ? 'Member < 6 months.' : '',
      !okAttendance ? 'Attendance below target.' : '',
      !okRoles ? 'Too few recent roles.' : '',
    ].filter(Boolean),
  };
}

export function monthsSince(date: Date): number {
  const now = new Date();
  return (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
}




