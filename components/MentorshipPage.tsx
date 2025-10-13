import React, { useState, useEffect } from 'react';
import { useToastmasters } from '../Context/ToastmastersContext';
import { mentorGuideContent } from '../utils/mentorshipCopy';
import { MentorshipPair } from '../types';
import { db } from '../services/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { VPEMentorCenter } from './VPEMentorCenter';
import { MyMentorshipSection } from './mentorship/MyMentorshipSection';

interface MemberWithMentorship {
  id: string;
  name: string;
  mentor: string | null;
  mentees: string[];
  notesCount: number;
}


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
  const [members, setMembers] = useState<MemberWithMentorship[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  const [showVPECenter, setShowVPECenter] = useState(false);

  useEffect(() => {
    if (!organization) return;

    const loadMentorshipData = async () => {
      try {
        setLoading(true);

        // Load all active pairings
        const pairingsSnapshot = await getDocs(
          collection(db, 'users', organization.ownerId, 'mentorship', 'mentorshipPairs', 'pairs')
        );
        
        const pairings: MentorshipPair[] = [];
        pairingsSnapshot.forEach(doc => {
          const data = doc.data() as MentorshipPair;
          if (data.active) {
            pairings.push({ id: doc.id, ...data });
          }
        });

        // Process each member (exclude archived members)
        const membersWithMentorship: MemberWithMentorship[] = organization.members
          .filter(member => member.status !== 'Archived')
          .map(member => {
          // Find mentor (where member is mentee)
          const mentorPairing = pairings.find(p => p.menteeId === member.id);
          const mentorMember = mentorPairing 
            ? organization.members.find(m => m.id === mentorPairing.mentorId)
            : null;
          
          // Find mentees (where member is mentor)
          const menteePairings = pairings.filter(p => p.mentorId === member.id);
          const menteeNames = menteePairings
            .map(p => {
              const menteeMember = organization.members.find(m => m.id === p.menteeId);
              return menteeMember?.name || null;
            })
            .filter(Boolean) as string[];
          
          // Count notes
          const notesCount = member.mentorshipNotes?.length || 0;

          return {
            id: member.id,
            name: member.name,
            mentor: mentorMember?.name || null,
            mentees: menteeNames,
            notesCount,
          };
        });

        setMembers(membersWithMentorship);
        setLoading(false);
      } catch (error) {
        console.error('Error loading mentorship data:', error);
        setLoading(false);
      }
    };

    loadMentorshipData();
  }, [organization]);


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

  // Calculate statistics
  const membersWithMentor = members.filter(m => m.mentor !== null).length;
  const membersWithoutMentor = members.filter(m => m.mentor === null).length;
  const activeMentors = members.filter(m => m.mentees.length > 0).length;

  // Get current user's member profile
  const currentMember = currentUser?.uid 
    ? organization?.members.find(m => m.uid === currentUser.uid)
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* My Mentorship Section - Shows for logged-in users with member profiles */}
      {currentMember && currentUser && (
        <MyMentorshipSection 
          currentUserId={currentUser.uid} 
          currentMemberId={currentMember.id} 
          showButtons={true}
          onShowGuide={() => setShowGuide(true)}
          onShowVPECenter={() => setShowVPECenter(!showVPECenter)}
          showVPECenter={showVPECenter}
          adminStatus={adminStatus}
          currentUser={currentUser}
        />
      )}

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
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Has Mentor</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{membersWithMentor}</p>
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
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Needs Mentor</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{membersWithoutMentor}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Mentors</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{activeMentors}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Members List */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Club Mentorship Relationships</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            See who is mentoring who in your club. Admin and VPE manage all pairings through the VPE Mentor Center.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Mentor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Mentees
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {members.map((member) => (
                <tr key={member.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {member.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {member.mentor || (
                      <span className="text-yellow-600 dark:text-yellow-400">No Mentor</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {member.mentees.length > 0 ? (
                      <div className="space-y-1">
                        {member.mentees.map((mentee, index) => (
                          <div key={index} className="text-sm">{mentee}</div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">No Mentees</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {member.notesCount > 0 ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                        {member.notesCount} note{member.notesCount > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">No notes</span>
                    )}
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
