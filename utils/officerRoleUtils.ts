import { OfficerRole } from '../types';

/**
 * Abbreviates officer role names for display in badges and compact UI elements
 */
export const abbreviateOfficerRole = (role: OfficerRole): string => {
  switch (role) {
    case OfficerRole.President:
      return 'President';
    case OfficerRole.VicePresidentEducation:
      return 'VPE';
    case OfficerRole.VicePresidentMembership:
      return 'VPM';
    case OfficerRole.VicePresidentPublicRelations:
      return 'VPPR';
    case OfficerRole.Secretary:
      return 'Secretary';
    case OfficerRole.Treasurer:
      return 'Treasurer';
    case OfficerRole.SergeantAtArms:
      return 'SAA';
    default:
      return role; // Fallback to original if not found
  }
};

/**
 * Gets the full officer role name for display in detailed contexts
 */
export const getFullOfficerRoleName = (role: OfficerRole): string => {
  return role; // Already the full name in the enum
};

