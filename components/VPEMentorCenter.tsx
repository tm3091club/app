import React, { useState, useEffect, useMemo } from 'react';
import { useToastmasters } from '../Context/ToastmastersContext';
import { evaluateMentorEligibility, EligibilityResult, monthsSince } from '../services/mentorshipEligibility';
import { mentorCopy } from '../utils/mentorshipCopy';
import { MentorshipPolicy, MentorshipOverride, MemberMetrics, MentorshipEligibilityStatus, MentorshipPair, MemberStatus } from '../types';
import { db } from '../services/firebase';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';

interface MemberWithEligibility {
  id: string;
  name: string;
  eligibility: EligibilityResult;
  metrics: MemberMetrics;
  override?: MentorshipOverride | null;
}

const SortIcon: React.FC<{ direction: 'ascending' | 'descending' | 'blocked-first' }> = ({ direction }) => (
  <div className="flex flex-col -space-y-1.5 opacity-50 group-hover:opacity-100 transition-opacity">
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 ${direction === 'ascending' ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 15l7-7 7 7" />
    </svg>
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 ${direction === 'descending' || direction === 'blocked-first' ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
    </svg>
  </div>
);

const OverrideModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  member: MemberWithEligibility | null;
  onSave: (memberId: string, eligible: boolean, reason: string, metrics?: Partial<MemberMetrics>) => void;
}> = ({ isOpen, onClose, member, onSave }) => {
  const [eligible, setEligible] = useState(false);
  const [reason, setReason] = useState('');
  const [speechesCompleted, setSpeechesCompleted] = useState(0);
  const [attendancePct90, setAttendancePct90] = useState(0);
  const [rolesIn90, setRolesIn90] = useState(0);

  useEffect(() => {
    if (member) {
      setEligible(member.override?.eligible ?? false);
      setReason(member.override?.reason ?? '');
      setSpeechesCompleted(member.metrics.speechesCompleted);
      setAttendancePct90(member.metrics.attendancePct90);
      setRolesIn90(member.metrics.rolesIn90);
    }
  }, [member]);

  if (!isOpen || !member) return null;

  const handleSave = () => {
    const updatedMetrics = {
      speechesCompleted,
      attendancePct90,
      rolesIn90,
    };
    onSave(member.id, eligible, reason, updatedMetrics);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {mentorCopy.dialogs.setOverrideTitle}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {mentorCopy.dialogs.setOverrideDesc}
          </p>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Member: {member.name}
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={eligible}
                  onChange={() => setEligible(true)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Approve as Mentor</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={!eligible}
                  onChange={() => setEligible(false)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Block for Now</span>
              </label>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reason
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              rows={3}
              placeholder="Explain why this member is approved or blocked..."
            />
          </div>

          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Update Metrics (Optional)
            </h4>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Speeches Completed
                </label>
                <input
                  type="number"
                  value={speechesCompleted}
                  onChange={(e) => setSpeechesCompleted(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Attendance % (90 days)
                </label>
                <input
                  type="number"
                  value={attendancePct90}
                  onChange={(e) => setAttendancePct90(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Roles (90 days)
                </label>
                <input
                  type="number"
                  value={rolesIn90}
                  onChange={(e) => setRolesIn90(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  min="0"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Update these metrics to reflect the member's actual progress. The months are calculated automatically from their join date.
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Save Override
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const PairingModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  mentor: MemberWithEligibility | null;
  mentee: MemberWithEligibility | null;
  onSave: (mentorId: string, menteeId: string) => void;
}> = ({ isOpen, onClose, mentor, mentee, onSave }) => {
  if (!isOpen || !mentor || !mentee) return null;

  const handleSave = () => {
    onSave(mentor.id, mentee.id);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Create Mentor-Mentee Pairing
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Confirm the mentorship pairing between these members.
          </p>
          
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-medium text-blue-900 dark:text-blue-200">Mentor</h4>
              <p className="text-blue-800 dark:text-blue-300">{mentor.name}</p>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                Speeches: {mentor.metrics.speechesCompleted} • 
                Months: {mentor.metrics.monthsSinceJoin} • 
                Attendance: {mentor.metrics.attendancePct90}%
              </p>
              {(mentor.eligibility.status === 'eligible' || mentor.eligibility.status === 'override_eligible') && (
                <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
                  ✓ Eligible to mentor others
                </p>
              )}
            </div>
            
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <h4 className="font-medium text-green-900 dark:text-green-200">Mentee</h4>
              <p className="text-green-800 dark:text-green-300">{mentee.name}</p>
              <p className="text-sm text-green-600 dark:text-green-400">
                Speeches: {mentee.metrics.speechesCompleted} • 
                Months: {mentee.metrics.monthsSinceJoin} • 
                Attendance: {mentee.metrics.attendancePct90}%
              </p>
              {(mentee.eligibility.status === 'eligible' || mentee.eligibility.status === 'override_eligible') && (
                <p className="text-xs text-green-500 dark:text-green-400 mt-1">
                  ✓ Also eligible to mentor others
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Create Pairing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const PolicyModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  policy: MentorshipPolicy;
  onSave: (policy: MentorshipPolicy) => void;
}> = ({ isOpen, onClose, policy, onSave }) => {
  const [formData, setFormData] = useState<MentorshipPolicy>(policy);

  useEffect(() => {
    setFormData(policy);
  }, [policy]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Mentorship Policy
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Minimum Speeches
              </label>
              <input
                type="number"
                value={formData.minSpeeches}
                onChange={(e) => setFormData({ ...formData, minSpeeches: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Minimum Months
              </label>
              <input
                type="number"
                value={formData.minMonths}
                onChange={(e) => setFormData({ ...formData, minMonths: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Minimum Attendance % (90 days)
              </label>
              <input
                type="number"
                value={formData.minAttendancePct90}
                onChange={(e) => setFormData({ ...formData, minAttendancePct90: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                min="0"
                max="100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Minimum Roles (90 days)
              </label>
              <input
                type="number"
                value={formData.minRoles90}
                onChange={(e) => setFormData({ ...formData, minRoles90: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                min="0"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Save Policy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface VPEMentorCenterProps {
  onBack: () => void;
}

export const VPEMentorCenter: React.FC<VPEMentorCenterProps> = ({ onBack }) => {
  const { organization, currentUser } = useToastmasters();
  const [members, setMembers] = useState<MemberWithEligibility[]>([]);
  const [policy, setPolicy] = useState<MentorshipPolicy>({
    minSpeeches: 3,
    minMonths: 6,
    minAttendancePct90: 50,
    minRoles90: 2,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'candidates' | 'overrides' | 'policy' | 'pairing'>('candidates');
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberWithEligibility | null>(null);
  const [pairings, setPairings] = useState<MentorshipPair[]>([]);
  const [showPairingModal, setShowPairingModal] = useState(false);
  const [selectedMentor, setSelectedMentor] = useState<MemberWithEligibility | null>(null);
  const [selectedMentee, setSelectedMentee] = useState<MemberWithEligibility | null>(null);
  const [sortConfig, setSortConfig] = useState<{ 
    key: 'name' | 'status' | 'metrics'; 
    direction: 'ascending' | 'descending' | 'blocked-first'
  }>({ key: 'status', direction: 'ascending' });
  const [mentorSortDirection, setMentorSortDirection] = useState<'ascending' | 'descending'>('ascending');
  const [menteeSortDirection, setMenteeSortDirection] = useState<'ascending' | 'descending'>('ascending');
  const [hasAutoSwitched, setHasAutoSwitched] = useState(false);

  useEffect(() => {
    if (!organization) return;

    const loadData = async () => {
      try {
        setLoading(true);

        // Load policy and pairings in parallel
        const [policyDoc, pairingsSnapshot] = await Promise.all([
          getDoc(doc(db, 'users', organization.ownerId, 'mentorship', 'mentorshipPolicy', 'policies', 'default')),
          getDocs(collection(db, 'users', organization.ownerId, 'mentorship', 'mentorshipPairs', 'pairs'))
        ]);
        
        if (policyDoc.exists()) {
          setPolicy(policyDoc.data() as MentorshipPolicy);
        }

        // Load existing pairings
        const existingPairings: MentorshipPair[] = [];
        pairingsSnapshot.forEach((doc) => {
          existingPairings.push({ id: doc.id, ...doc.data() } as MentorshipPair);
        });
        setPairings(existingPairings);

        // Process members from organization data
        const membersWithEligibility: MemberWithEligibility[] = [];

        // Load all metrics and overrides in parallel
        // Filter out archived members from mentorship consideration
        const memberPromises = (organization.members || [])
          .filter(member => member.status !== MemberStatus.Archived)
          .map(async (member) => {
          // Calculate months since join from joinedDate
          let monthsSinceJoin = 0;
          if (member.joinedDate) {
            const joinDate = new Date(member.joinedDate);
            monthsSinceJoin = monthsSince(joinDate);
          }
          
          // Load metrics and override in parallel
          const [metricsDoc, overrideDoc] = await Promise.all([
            getDoc(doc(db, 'users', organization.ownerId, 'mentorship', 'memberMetrics', 'metrics', member.id)),
            getDoc(doc(db, 'users', organization.ownerId, 'mentorship', 'mentorshipOverrides', 'overrides', member.id))
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
            override,
          };
        });

        const results = await Promise.all(memberPromises);
        membersWithEligibility.push(...results);

        setMembers(membersWithEligibility);
      } catch (error) {
        console.error('Error loading VPE mentor center data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [organization, policy]);

  const handleOverrideSave = async (memberId: string, eligible: boolean, reason: string, metrics?: Partial<MemberMetrics>) => {
    try {
      const overrideData: MentorshipOverride = {
        eligible,
        reason,
        setByUid: currentUser?.uid || '',
      };

      await setDoc(doc(db, 'users', organization!.ownerId, 'mentorship', 'mentorshipOverrides', 'overrides', memberId), overrideData);
      
      // Update metrics if provided
      if (metrics) {
        const metricsData: MemberMetrics = {
          speechesCompleted: metrics.speechesCompleted || 0,
          monthsSinceJoin: 0, // Will be calculated automatically
          attendancePct90: metrics.attendancePct90 || 0,
          rolesIn90: metrics.rolesIn90 || 0,
          lastUpdated: new Date(),
        };
        
        await setDoc(doc(db, 'users', organization!.ownerId, 'mentorship', 'memberMetrics', 'metrics', memberId), metricsData);
      }
      
      // Refresh the VPE center data first
      const loadData = async () => {
        try {
          setLoading(true);

          // Load policy
          const policyDoc = await getDoc(doc(db, 'users', organization!.ownerId, 'mentorship', 'mentorshipPolicy', 'policies', 'default'));
          if (policyDoc.exists()) {
            setPolicy(policyDoc.data() as MentorshipPolicy);
          }

          // Process members from organization data
          const membersWithEligibility: MemberWithEligibility[] = [];

          // Load all metrics and overrides in parallel
          const memberPromises = (organization!.members || [])
            .filter(member => member.status !== MemberStatus.Archived)
            .map(async (member) => {
            // Calculate months since join from joinedDate
            let monthsSinceJoin = 0;
            if (member.joinedDate) {
              const joinDate = new Date(member.joinedDate);
              monthsSinceJoin = monthsSince(joinDate);
            }
            
            // Load metrics and override in parallel
            const [metricsDoc, overrideDoc] = await Promise.all([
              getDoc(doc(db, 'users', organization!.ownerId, 'mentorship', 'memberMetrics', 'metrics', member.id)),
              getDoc(doc(db, 'users', organization!.ownerId, 'mentorship', 'mentorshipOverrides', 'overrides', member.id))
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
              override,
            };
          });

          const results = await Promise.all(memberPromises);
          membersWithEligibility.push(...results);

          setMembers(membersWithEligibility);
        } catch (error) {
          console.error('Error loading VPE mentor center data:', error);
        } finally {
          setLoading(false);
        }
      };

      await loadData();
      
      // Then refresh the mentorship page data
      if ((window as any).refreshMentorshipData) {
        await (window as any).refreshMentorshipData();
      }
    } catch (error) {
      console.error('Error saving override:', error);
    }
  };

  const handlePolicySave = async (newPolicy: MentorshipPolicy) => {
    try {
      await setDoc(doc(db, 'users', organization!.ownerId, 'mentorship', 'mentorshipPolicy', 'policies', 'default'), newPolicy);
      setPolicy(newPolicy);
    } catch (error) {
      console.error('Error saving policy:', error);
    }
  };

  const handleRemoveOverride = async (memberId: string) => {
    try {
      await deleteDoc(doc(db, 'users', organization!.ownerId, 'mentorship', 'mentorshipOverrides', 'overrides', memberId));
      
      // Refresh the VPE center data first
      const loadData = async () => {
        try {
          setLoading(true);

          // Load policy
          const policyDoc = await getDoc(doc(db, 'users', organization!.ownerId, 'mentorship', 'mentorshipPolicy', 'policies', 'default'));
          if (policyDoc.exists()) {
            setPolicy(policyDoc.data() as MentorshipPolicy);
          }

          // Process members from organization data
          const membersWithEligibility: MemberWithEligibility[] = [];

          // Load all metrics and overrides in parallel
          const memberPromises = (organization!.members || [])
            .filter(member => member.status !== MemberStatus.Archived)
            .map(async (member) => {
            // Calculate months since join from joinedDate
            let monthsSinceJoin = 0;
            if (member.joinedDate) {
              const joinDate = new Date(member.joinedDate);
              monthsSinceJoin = monthsSince(joinDate);
            }
            
            // Load metrics and override in parallel
            const [metricsDoc, overrideDoc] = await Promise.all([
              getDoc(doc(db, 'users', organization!.ownerId, 'mentorship', 'memberMetrics', 'metrics', member.id)),
              getDoc(doc(db, 'users', organization!.ownerId, 'mentorship', 'mentorshipOverrides', 'overrides', member.id))
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
              override,
            };
          });

          const results = await Promise.all(memberPromises);
          membersWithEligibility.push(...results);

          setMembers(membersWithEligibility);
        } catch (error) {
          console.error('Error loading VPE mentor center data:', error);
        } finally {
          setLoading(false);
        }
      };

      await loadData();
      
      // Then refresh the mentorship page data
      if ((window as any).refreshMentorshipData) {
        await (window as any).refreshMentorshipData();
      }
    } catch (error) {
      console.error('Error removing override:', error);
    }
  };

  const handleCreatePairing = async (mentorId: string, menteeId: string) => {
    try {
      const pairingId = `${mentorId}_${menteeId}`;
      const pairingData: Omit<MentorshipPair, 'id'> = {
        mentorId,
        menteeId,
        createdAt: serverTimestamp(),
        active: true,
      };

      await setDoc(doc(db, 'users', organization!.ownerId, 'mentorship', 'mentorshipPairs', 'pairs', pairingId), pairingData);
      
      // Update local state
      setPairings(prev => [...prev, { id: pairingId, ...pairingData }]);
      
      // Close modal
      setShowPairingModal(false);
      setSelectedMentor(null);
      setSelectedMentee(null);
    } catch (error) {
      console.error('Error creating pairing:', error);
    }
  };

  const handleRemovePairing = async (pairingId: string) => {
    try {
      await deleteDoc(doc(db, 'users', organization!.ownerId, 'mentorship', 'mentorshipPairs', 'pairs', pairingId));
      
      // Update local state
      setPairings(prev => prev.filter(p => p.id !== pairingId));
    } catch (error) {
      console.error('Error removing pairing:', error);
    }
  };

  // Sorting logic
  const handleSortRequest = (key: 'name' | 'status' | 'metrics') => {
    setSortConfig(currentConfig => {
      if (currentConfig.key === key) {
        // Special cycling for status column: ascending -> blocked-first -> ascending
        if (key === 'status') {
          if (currentConfig.direction === 'ascending') {
            return { key, direction: 'blocked-first' };
          } else {
            return { key, direction: 'ascending' };
          }
        }
        // Normal toggle for other columns
        return {
          key,
          direction: currentConfig.direction === 'ascending' ? 'descending' : 'ascending',
        };
      } else {
        return { key, direction: 'ascending' };
      }
    });
  };

  // All hooks and calculations must be before any early returns
  const eligibleMembers = useMemo(() => 
    members.filter(m => m.eligibility.status === 'eligible' || m.eligibility.status === 'override_eligible'),
    [members]
  );
  const needsReviewMembers = useMemo(() => 
    members.filter(m => m.eligibility.status === 'needs_review'),
    [members]
  );
  const notEligibleMembers = useMemo(() => 
    members.filter(m => m.eligibility.status === 'not_eligible' || m.eligibility.status === 'override_blocked'),
    [members]
  );
  const overrideMembers = useMemo(() => 
    members.filter(m => m.override),
    [members]
  );

  // Calculate mentor-mentee ratio
  const mentorMenteeRatio = useMemo(() => {
    const totalActiveMembers = members.length; // members already filtered to exclude archived
    const totalActivePairs = pairings.filter(p => p.active).length;
    return totalActiveMembers > 0 ? Math.round((totalActivePairs / totalActiveMembers) * 100) : 0;
  }, [members, pairings]);

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      switch (sortConfig.key) {
        case 'name':
          const nameA1 = a.name.toLowerCase();
          const nameB1 = b.name.toLowerCase();
          if (nameA1 < nameB1) return sortConfig.direction === 'ascending' ? -1 : 1;
          if (nameA1 > nameB1) return sortConfig.direction === 'ascending' ? 1 : -1;
          return 0;
        
        case 'status':
          // Custom status order based on sort direction
          const getStatusOrder = (status: string) => {
            if (sortConfig.direction === 'blocked-first') {
              // blocked -> approved -> not_eligible -> needs_review
              if (status === 'override_blocked') return 0;
              if (status === 'eligible' || status === 'override_eligible') return 1;
              if (status === 'not_eligible') return 2;
              if (status === 'needs_review') return 3;
              return 4;
            } else {
              // Default ascending: not_eligible -> blocked -> needs_review -> approved
              if (status === 'not_eligible') return 0;
              if (status === 'override_blocked') return 1;
              if (status === 'needs_review') return 2;
              if (status === 'eligible' || status === 'override_eligible') return 3;
              return 4;
            }
          };
          const statusOrderA = getStatusOrder(a.eligibility.status);
          const statusOrderB = getStatusOrder(b.eligibility.status);
          if (statusOrderA !== statusOrderB) {
            return statusOrderA - statusOrderB;
          }
          // If same status, sort by name
          const nameA2 = a.name.toLowerCase();
          const nameB2 = b.name.toLowerCase();
          return nameA2.localeCompare(nameB2);
        
        case 'metrics':
          // Sort by attendance percentage (lowest to highest by default)
          const attendanceA = a.metrics.attendancePct90;
          const attendanceB = b.metrics.attendancePct90;
          if (attendanceA !== attendanceB) {
            return sortConfig.direction === 'ascending' ? attendanceA - attendanceB : attendanceB - attendanceA;
          }
          // If same attendance, sort by speeches completed
          const speechesA = a.metrics.speechesCompleted;
          const speechesB = b.metrics.speechesCompleted;
          if (speechesA !== speechesB) {
            return sortConfig.direction === 'ascending' ? speechesA - speechesB : speechesB - speechesA;
          }
          // If same speeches, sort by name
          const nameA3 = a.name.toLowerCase();
          const nameB3 = b.name.toLowerCase();
          return nameA3.localeCompare(nameB3);
        
        default:
          return 0;
      }
    });
  }, [members, sortConfig]);

  const sortedEligibleMembers = useMemo(() => {
    return [...eligibleMembers].sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      if (mentorSortDirection === 'ascending') {
        return nameA.localeCompare(nameB);
      } else {
        return nameB.localeCompare(nameA);
      }
    });
  }, [eligibleMembers, mentorSortDirection]);

  const sortedAllMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      if (menteeSortDirection === 'ascending') {
        return nameA.localeCompare(nameB);
      } else {
        return nameB.localeCompare(nameA);
      }
    });
  }, [members, menteeSortDirection]);

  // Auto-switch tab logic: Pairing when all members have status, Candidates when all are paired
  const shouldShowPairingTab = useMemo(() => {
    if (members.length === 0) return false;
    
    // Check if all members have been assigned a status (not needs_review)
    const allMembersHaveStatus = members.every(member => member.eligibility.status !== 'needs_review');
    
    // Check if all eligible members are paired
    const eligibleMembers = members.filter(m => 
      m.eligibility.status === 'eligible' || m.eligibility.status === 'override_eligible'
    );
    const activePairings = pairings.filter(p => p.active);
    const pairedMemberIds = new Set([
      ...activePairings.map(p => p.mentorId),
      ...activePairings.map(p => p.menteeId)
    ]);
    const allEligibleMembersPaired = eligibleMembers.every(member => pairedMemberIds.has(member.id));
    
    // Show pairing tab if all members have status but not all eligible members are paired
    return allMembersHaveStatus && !allEligibleMembersPaired;
  }, [members, pairings]);

  // Auto-switch to appropriate tab ONLY on initial load
  useEffect(() => {
    if (!hasAutoSwitched && !loading) {
      if (shouldShowPairingTab && activeTab === 'candidates') {
        setActiveTab('pairing');
        setHasAutoSwitched(true);
      } else if (!shouldShowPairingTab && activeTab === 'pairing') {
        setActiveTab('candidates');
        setHasAutoSwitched(true);
      } else {
        setHasAutoSwitched(true);
      }
    }
  }, [shouldShowPairingTab, loading, hasAutoSwitched, activeTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600 dark:text-gray-400">Loading VPE mentor center...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <button
            onClick={onBack}
            className="mr-4 p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            title="Back to Mentorship"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">VPE Mentor Center</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage mentor eligibility, overrides, and policy settings.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('candidates')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'candidates'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Candidates ({members.length})
          </button>
          <button
            onClick={() => setActiveTab('pairing')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'pairing'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Pairing
          </button>
          <button
            onClick={() => setActiveTab('overrides')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overrides'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Overrides ({overrideMembers.length})
          </button>
          <button
            onClick={() => setActiveTab('policy')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'policy'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Policy
          </button>
        </nav>
      </div>

      {/* Candidates Tab */}
      {activeTab === 'candidates' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">Eligible ({eligibleMembers.length})</h3>
              <p className="text-sm text-green-600 dark:text-green-400">Ready to mentor</p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">Needs Review ({needsReviewMembers.length})</h3>
              <p className="text-sm text-yellow-600 dark:text-yellow-400">Close call - VPE decision</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Not Eligible ({notEligibleMembers.length})</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Doesn't meet criteria</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">All Members</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      <button
                        type="button"
                        onClick={() => handleSortRequest('name')}
                        className="flex items-center gap-2 group focus:outline-none hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        <span>Member</span>
                        <SortIcon direction={sortConfig.key === 'name' ? sortConfig.direction : 'ascending'} />
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      <button
                        type="button"
                        onClick={() => handleSortRequest('status')}
                        className="flex items-center gap-2 group focus:outline-none hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        <span>Status</span>
                        <SortIcon direction={sortConfig.key === 'status' ? sortConfig.direction : 'ascending'} />
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      <button
                        type="button"
                        onClick={() => handleSortRequest('metrics')}
                        className="flex items-center gap-2 group focus:outline-none hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        <span>Metrics</span>
                        <SortIcon direction={sortConfig.key === 'metrics' ? sortConfig.direction : 'ascending'} />
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {sortedMembers.map((member) => (
                    <tr key={member.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {member.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          member.eligibility.status === 'eligible' ? 'bg-green-100 text-green-800' :
                          member.eligibility.status === 'override_eligible' ? 'bg-blue-100 text-blue-800' :
                          member.eligibility.status === 'needs_review' ? 'bg-yellow-100 text-yellow-800' :
                          member.eligibility.status === 'override_blocked' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {member.eligibility.status === 'eligible' ? 'Eligible' :
                           member.eligibility.status === 'override_eligible' ? 'Approved' :
                           member.eligibility.status === 'needs_review' ? 'Needs Review' :
                           member.eligibility.status === 'override_blocked' ? 'Blocked' :
                           'Not Eligible'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        Speeches: {member.metrics.speechesCompleted}/{policy.minSpeeches} • 
                        Months: {Math.min(member.metrics.monthsSinceJoin, policy.minMonths)}/{policy.minMonths} • 
                        Attendance: {member.metrics.attendancePct90}% • 
                        Roles: {member.metrics.rolesIn90}/{policy.minRoles90}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => {
                            setSelectedMember(member);
                            setShowOverrideModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Set Override
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Overrides Tab */}
      {activeTab === 'overrides' && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Active Overrides</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Override
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {overrideMembers.map((member) => (
                  <tr key={member.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {member.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        member.override?.eligible ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {member.override?.eligible ? 'Approved' : 'Blocked'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {member.override?.reason}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleRemoveOverride(member.id)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Policy Tab */}
      {activeTab === 'policy' && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Mentorship Policy</h2>
              <button
                onClick={() => setShowPolicyModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Edit Policy
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Minimum Speeches</h3>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{policy.minSpeeches}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Minimum Months</h3>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{policy.minMonths}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Minimum Attendance % (90 days)</h3>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{policy.minAttendancePct90}%</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Minimum Roles (90 days)</h3>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{policy.minRoles90}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pairing Tab */}
      {activeTab === 'pairing' && (
        <div className="space-y-6">
          {/* Active Pairings */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Active Mentor-Mentee Pairings</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Current Mentor to Mentee Ratio = {mentorMenteeRatio}%
              </p>
            </div>
            <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700">
                      Mentor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700">
                      Mentee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {pairings.filter(p => p.active).map((pairing) => {
                    const mentor = members.find(m => m.id === pairing.mentorId);
                    const mentee = members.find(m => m.id === pairing.menteeId);
                    return (
                      <tr key={pairing.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {mentor?.name || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {mentee?.name || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {pairing.createdAt ? (() => {
                            try {
                              // Handle different Firestore timestamp formats
                              if (pairing.createdAt.seconds !== undefined) {
                                return new Date(pairing.createdAt.seconds * 1000).toLocaleDateString();
                              } else if (pairing.createdAt.toDate && typeof pairing.createdAt.toDate === 'function') {
                                return pairing.createdAt.toDate().toLocaleDateString();
                              } else if (pairing.createdAt instanceof Date) {
                                return pairing.createdAt.toLocaleDateString();
                              } else if (typeof pairing.createdAt === 'string') {
                                return new Date(pairing.createdAt).toLocaleDateString();
                              } else {
                                // For serverTimestamp() that hasn't been resolved yet
                                return 'Just created';
                              }
                            } catch (error) {
                              console.error('Date parsing error:', error, pairing.createdAt);
                              return 'Unknown';
                            }
                          })() : 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => handleRemovePairing(pairing.id)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {pairings.filter(p => p.active).length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        No active pairings
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Create New Pairing */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Create New Pairing</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Under "Available Mentors" click "Select as Mentor", then choose a mentee.
              </p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Available Mentors */}
                <div>
                  <button
                    onClick={() => setMentorSortDirection(prev => prev === 'ascending' ? 'descending' : 'ascending')}
                    className="flex items-center gap-2 mb-3 text-base font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors group"
                  >
                    <span>Available Mentors</span>
                    <SortIcon direction={mentorSortDirection} />
                  </button>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {sortedEligibleMembers
                      .filter(member => !selectedMentee || member.id !== selectedMentee.id)
                      .map((member) => {
                      const mentorPairings = pairings.filter(p => p.mentorId === member.id && p.active);
                      const isSelected = selectedMentor?.id === member.id;
                      const orgMember = organization?.members?.find(m => m.id === member.id);
                      const joinDate = orgMember?.joinedDate ? new Date(orgMember.joinedDate).toLocaleDateString() : 'Unknown';
                      return (
                        <div key={member.id} className={`p-3 border rounded-lg ${
                          isSelected ? 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-600'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{member.name}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Joined: {joinDate}
                              </p>
                              {mentorPairings.length > 0 && (
                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                  Currently mentoring {mentorPairings.length} member{mentorPairings.length > 1 ? 's' : ''}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col items-end space-y-1">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                                Available Mentor
                              </span>
                              <button
                                onClick={() => {
                                  setSelectedMentor(member);
                                  setSelectedMentee(null); // Clear any previous mentee selection
                                }}
                                className={`text-xs px-2 py-1 rounded ${
                                  isSelected 
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' 
                                    : 'text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300'
                                }`}
                              >
                                {isSelected ? 'Selected' : 'Select as Mentor'}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {sortedEligibleMembers.length === 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                        No eligible mentors available
                      </p>
                    )}
                  </div>
                </div>

                {/* All Members (Potential Mentees) */}
                <div>
                  <button
                    onClick={() => setMenteeSortDirection(prev => prev === 'ascending' ? 'descending' : 'ascending')}
                    className="flex items-center gap-2 mb-3 text-base font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors group"
                  >
                    <span>{selectedMentor ? `Select Mentee for ${selectedMentor.name}` : 'All Members (Potential Mentees)'}</span>
                    <SortIcon direction={menteeSortDirection} />
                  </button>
                  {selectedMentor && (
                    <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm text-blue-800 dark:text-blue-300">
                      Mentor selected: <strong>{selectedMentor.name}</strong>
                    </div>
                  )}
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {sortedAllMembers
                      .filter(member => !selectedMentor || member.id !== selectedMentor.id)
                      .map((member) => {
                      const menteePairings = pairings.filter(p => p.menteeId === member.id && p.active);
                      const isSelected = selectedMentee?.id === member.id;
                      const isEligible = member.eligibility.status === 'eligible' || member.eligibility.status === 'override_eligible';
                      const orgMember = organization?.members?.find(m => m.id === member.id);
                      const joinDate = orgMember?.joinedDate ? new Date(orgMember.joinedDate).toLocaleDateString() : 'Unknown';
                      
                      return (
                        <div key={member.id} className={`p-3 border rounded-lg ${
                          selectedMentee?.id === member.id ? 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20' :
                          'border-gray-200 dark:border-gray-600'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{member.name}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Joined: {joinDate}
                              </p>
                              {menteePairings.length > 0 && (
                                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                  Has {menteePairings.length} mentor{menteePairings.length > 1 ? 's' : ''}
                                </p>
                              )}
                              {isEligible && (
                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                  Also eligible to mentor
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col items-end space-y-1">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                selectedMentee?.id === member.id ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                                menteePairings.length > 0 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                              }`}>
                                {selectedMentee?.id === member.id ? 'Selected' : 
                                 menteePairings.length > 0 ? `Has ${menteePairings.length} Mentor${menteePairings.length > 1 ? 's' : ''}` :
                                 'Available Mentee'}
                              </span>
                              {selectedMentor && (
                                <button
                                  onClick={() => setSelectedMentee(member)}
                                  className={`text-xs px-2 py-1 rounded ${
                                    isSelected 
                                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' 
                                      : 'text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300'
                                  }`}
                                >
                                  {isSelected ? 'Selected' : 'Select as Mentee'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {sortedAllMembers.length === 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                        No members available
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Pairing Actions */}
              {selectedMentor && (
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200">
                        {selectedMentee ? 'Ready to Pair' : 'Select a Mentee'}
                      </h4>
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        Mentor: <strong>{selectedMentor.name}</strong>
                        {selectedMentee && ` → Mentee: ${selectedMentee.name}`}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedMentor(null);
                          setSelectedMentee(null);
                        }}
                        className="px-3 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                      >
                        Clear Selection
                      </button>
                      {selectedMentee && (
                        <button
                          onClick={() => setShowPairingModal(true)}
                          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Create Pairing
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <h4 className="text-sm font-medium text-green-900 dark:text-green-200 mb-2">Flexible Pairing System</h4>
                <ul className="text-sm text-green-800 dark:text-green-300 space-y-1">
                  <li>• <strong>Mentors can also be mentees:</strong> Experienced members can both mentor others and receive mentorship</li>
                  <li>• <strong>Multiple mentors per mentee:</strong> Members can have several mentors for different areas of expertise</li>
                  <li>• <strong>All members can be mentees:</strong> Even eligible mentors can benefit from additional guidance</li>
                  <li>• <strong>Flexible relationships:</strong> Create pairings based on specific needs and goals</li>
                  <li>• <strong>Cross-mentoring:</strong> Members can mentor each other in different areas</li>
                  <li>• Monitor mentorship progress through the Mentorship Notes system</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      <OverrideModal
        isOpen={showOverrideModal}
        onClose={() => setShowOverrideModal(false)}
        member={selectedMember}
        onSave={handleOverrideSave}
      />

      <PolicyModal
        isOpen={showPolicyModal}
        onClose={() => setShowPolicyModal(false)}
        policy={policy}
        onSave={handlePolicySave}
      />

      <PairingModal
        isOpen={showPairingModal}
        onClose={() => setShowPairingModal(false)}
        mentor={selectedMentor}
        mentee={selectedMentee}
        onSave={handleCreatePairing}
      />
    </div>
  );
};
