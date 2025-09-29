import React, { useState, useEffect, useCallback } from 'react';
import { useToastmasters } from '../Context/ToastmastersContext';
import { evaluateMentorEligibility, EligibilityResult } from '../services/mentorshipEligibility';
import { mentorCopy, mentorGuideContent } from '../utils/mentorshipCopy';
import { MentorshipPolicy, MentorshipOverride, MemberMetrics, MentorshipEligibilityStatus } from '../types';
import { db } from '../services/firebase';
import { collection, doc, getDoc, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { VPEMentorCenter } from './VPEMentorCenter';
import { monthsSince } from '../services/mentorshipEligibility';

interface MemberWithEligibility {
  id: string;
  name: string;
  eligibility: EligibilityResult;
  metrics: MemberMetrics;
}

const EligibilityBadge: React.FC<{ status: MentorshipEligibilityStatus; reasons: string[] }> = ({ status, reasons }) => {
  const getBadgeClasses = (status: MentorshipEligibilityStatus) => {
    switch (status) {
      case 'eligible':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'needs_review':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'not_eligible':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'override_eligible':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'override_blocked':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getBadgeText = (status: MentorshipEligibilityStatus) => {
    switch (status) {
      case 'eligible':
        return mentorCopy.badge.eligible;
      case 'needs_review':
        return mentorCopy.badge.needs_review;
      case 'not_eligible':
        return mentorCopy.badge.not_eligible;
      case 'override_eligible':
        return mentorCopy.badge.override_ok;
      case 'override_blocked':
        return mentorCopy.badge.override_blocked;
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="relative group">
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getBadgeClasses(status)}`}>
        {getBadgeText(status)}
      </span>
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 max-w-xs">
        <div className="space-y-1">
          {reasons.map((reason, index) => (
            <div key={index}>{reason}</div>
          ))}
        </div>
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  );
};

const MentorGuideModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Mentor Guide</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                {mentorGuideContent.eligibility.title}
              </h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                {mentorGuideContent.eligibility.content.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                {mentorGuideContent.whatMentorsDo.title}
              </h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                {mentorGuideContent.whatMentorsDo.content.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                {mentorGuideContent.gettingStarted.title}
              </h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                {mentorGuideContent.gettingStarted.content.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                {mentorGuideContent.bestPractices.title}
              </h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                {mentorGuideContent.bestPractices.content.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                {mentorGuideContent.whenToAskVPE.title}
              </h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                {mentorGuideContent.whenToAskVPE.content.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const MentorshipPage: React.FC = () => {
  const { organization, currentUser, adminStatus } = useToastmasters();
  const [members, setMembers] = useState<MemberWithEligibility[]>([]);
  const [policy, setPolicy] = useState<MentorshipPolicy>({
    minSpeeches: 3,
    minMonths: 6,
    minAttendancePct90: 50,
    minRoles90: 2,
  });
  const [loading, setLoading] = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  const [showVPECenter, setShowVPECenter] = useState(false);

  useEffect(() => {
    if (!organization) return;

    const loadMentorshipData = async () => {
      try {
        setLoading(true);

        // Load policy
        const policyDoc = await getDoc(doc(db, 'organizations', organization.ownerId, 'mentorshipPolicy', 'default'));
        if (policyDoc.exists()) {
          setPolicy(policyDoc.data() as MentorshipPolicy);
        }

        // Process members from organization data
        const membersWithEligibility: MemberWithEligibility[] = [];

        // Load all metrics and overrides in parallel
        const memberPromises = (organization.members || []).map(async (member) => {
          // Calculate months since join from joinedDate
          let monthsSinceJoin = 0;
          if (member.joinedDate) {
            const joinDate = new Date(member.joinedDate);
            monthsSinceJoin = monthsSince(joinDate);
          }
          
          // Load metrics and override in parallel
          const [metricsDoc, overrideDoc] = await Promise.all([
            getDoc(doc(db, 'organizations', organization.ownerId, 'memberMetrics', member.id)),
            getDoc(doc(db, 'organizations', organization.ownerId, 'mentorshipOverrides', member.id))
          ]);

          const metrics: MemberMetrics = metricsDoc.exists() 
            ? {
                ...metricsDoc.data() as MemberMetrics,
                monthsSinceJoin, // Override with calculated value
              }
            : {
                speechesCompleted: 0,
                monthsSinceJoin,
                attendancePct90: 0,
                rolesIn90: 0,
                lastUpdated: new Date(),
              };

          const override: MentorshipOverride | null = overrideDoc.exists() 
            ? overrideDoc.data() as MentorshipOverride
            : null;

          // Calculate eligibility
          const eligibility = evaluateMentorEligibility({
            speechesCompleted: metrics.speechesCompleted,
            monthsSinceJoin: metrics.monthsSinceJoin,
            attendancePct90: metrics.attendancePct90,
            rolesIn90: metrics.rolesIn90,
            policy,
            override,
          });

          return {
            id: member.id,
            name: member.name,
            eligibility,
            metrics,
          };
        });

        const results = await Promise.all(memberPromises);
        membersWithEligibility.push(...results);

        setMembers(membersWithEligibility);
        setLoading(false);
      } catch (error) {
        console.error('Error loading mentorship data:', error);
        setLoading(false);
      }
    };

    loadMentorshipData();
  }, [organization, policy]);

  // Add a refresh function that can be called from VPE center
  const refreshMentorshipData = useCallback(async () => {
    if (!organization) return;

    try {
      // Load policy first
      const policyDoc = await getDoc(doc(db, 'organizations', organization.ownerId, 'mentorshipPolicy', 'default'));
      let currentPolicy = policy;
      if (policyDoc.exists()) {
        currentPolicy = policyDoc.data() as MentorshipPolicy;
        setPolicy(currentPolicy);
      }

      // Process members from organization data
      const membersWithEligibility: MemberWithEligibility[] = [];

      // Load all metrics and overrides in parallel
      const memberPromises = (organization.members || []).map(async (member) => {
        // Calculate months since join from joinedDate
        let monthsSinceJoin = 0;
        if (member.joinedDate) {
          const joinDate = new Date(member.joinedDate);
          monthsSinceJoin = monthsSince(joinDate);
        }
        
        // Load metrics and override in parallel
        const [metricsDoc, overrideDoc] = await Promise.all([
          getDoc(doc(db, 'organizations', organization.ownerId, 'memberMetrics', member.id)),
          getDoc(doc(db, 'organizations', organization.ownerId, 'mentorshipOverrides', member.id))
        ]);

        const metrics: MemberMetrics = metricsDoc.exists() 
          ? {
              ...metricsDoc.data() as MemberMetrics,
              monthsSinceJoin, // Override with calculated value
            }
          : {
              speechesCompleted: 0,
              monthsSinceJoin,
              attendancePct90: 0,
              rolesIn90: 0,
              lastUpdated: new Date(),
            };

        const override: MentorshipOverride | null = overrideDoc.exists() 
          ? overrideDoc.data() as MentorshipOverride
          : null;

        // Calculate eligibility using the current policy
        const eligibility = evaluateMentorEligibility({
          speechesCompleted: metrics.speechesCompleted,
          monthsSinceJoin: metrics.monthsSinceJoin,
          attendancePct90: metrics.attendancePct90,
          rolesIn90: metrics.rolesIn90,
          policy: currentPolicy,
          override,
        });

        return {
          id: member.id,
          name: member.name,
          eligibility,
          metrics,
        };
      });

      const results = await Promise.all(memberPromises);
      membersWithEligibility.push(...results);

      setMembers(membersWithEligibility);
    } catch (error) {
      console.error('Error refreshing mentorship data:', error);
    }
  }, [organization]);

  // Expose refresh function globally so VPE center can call it
  useEffect(() => {
    (window as any).refreshMentorshipData = refreshMentorshipData;
    return () => {
      delete (window as any).refreshMentorshipData;
    };
  }, [organization, refreshMentorshipData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600 dark:text-gray-400">Loading mentorship data...</div>
      </div>
    );
  }

  if (showVPECenter) {
    return <VPEMentorCenter onBack={() => setShowVPECenter(false)} />;
  }

  const eligibleMembers = members.filter(m => 
    m.eligibility.status === 'eligible' || m.eligibility.status === 'override_eligible'
  );
  const needsReviewMembers = members.filter(m => m.eligibility.status === 'needs_review');
  const notEligibleMembers = members.filter(m => 
    m.eligibility.status === 'not_eligible' || m.eligibility.status === 'override_blocked'
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Mentorship</h1>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowGuide(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Learn about Mentoring
            </button>
            {(adminStatus?.hasAdminRights && (currentUser?.role === 'Admin' || currentUser?.officerRole === 'Vice President Education')) && (
              <button 
                onClick={() => setShowVPECenter(!showVPECenter)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                {showVPECenter ? 'Back to Mentorship' : 'VPE Mentor Center'}
              </button>
            )}
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Track mentor eligibility and manage mentorship relationships in your club.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Eligible</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{eligibleMembers.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Needs Review</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{needsReviewMembers.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Not Eligible</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{notEligibleMembers.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Members List */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Member Eligibility</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Eligibility
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Speeches
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Months
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Attendance (90d)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Roles (90d)
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {members.map((member) => (
                <tr key={member.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {member.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <EligibilityBadge 
                      status={member.eligibility.status as MentorshipEligibilityStatus} 
                      reasons={member.eligibility.reasons} 
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {member.metrics.speechesCompleted}/{policy.minSpeeches}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {Math.min(member.metrics.monthsSinceJoin, policy.minMonths)}/{policy.minMonths}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {member.metrics.attendancePct90}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {member.metrics.rolesIn90}/{policy.minRoles90}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <MentorGuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />
    </div>
  );
};
