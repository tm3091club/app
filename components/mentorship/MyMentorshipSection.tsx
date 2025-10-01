import React, { useState, useEffect } from 'react';
import { useToastmasters } from '../../Context/ToastmastersContext';
import { db } from '../../services/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { MentorshipPair } from '../../types';

interface MyMentorshipSectionProps {
  currentUserId: string;
  currentMemberId: string;
}

export const MyMentorshipSection: React.FC<MyMentorshipSectionProps> = ({ 
  currentUserId, 
  currentMemberId 
}) => {
  const { organization } = useToastmasters();
  const [myMentor, setMyMentor] = useState<string | null>(null);
  const [myMentees, setMyMentees] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organization || !currentMemberId) return;

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
        
        // Find my mentor (where I am the mentee)
        const mentorPairing = pairings.find(p => p.menteeId === currentMemberId);
        if (mentorPairing) {
          const mentorMember = organization.members.find(m => m.id === mentorPairing.mentorId);
          setMyMentor(mentorMember?.name || null);
        }
        
        // Find my mentees (where I am the mentor)
        const menteePairings = pairings.filter(p => p.mentorId === currentMemberId);
        const menteeNames = menteePairings
          .map(p => {
            const menteeMember = organization.members.find(m => m.id === p.menteeId);
            return menteeMember?.name || null;
          })
          .filter(Boolean) as string[];
        setMyMentees(menteeNames);
        
      } catch (error) {
        console.error('Error loading mentorship data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMentorshipData();
  }, [organization, currentMemberId]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
        <p className="text-sm text-gray-500">Loading mentorship data...</p>
      </div>
    );
  }

  const currentMember = organization?.members.find(m => m.id === currentMemberId);

  return (
    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden mb-8">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Mentorship</h2>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* My Mentor */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">My Mentor</h3>
            {myMentor ? (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-lg font-medium text-blue-900 dark:text-blue-200">{myMentor}</p>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  No assigned mentor. Contact Admin or VPE to request a mentor.
                </p>
              </div>
            )}
          </div>

          {/* My Mentees */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              My Mentees {myMentees.length > 0 && `(${myMentees.length})`}
            </h3>
            {myMentees.length > 0 ? (
              <div className="space-y-2">
                {myMentees.map((mentee, index) => (
                  <div 
                    key={index} 
                    className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"
                  >
                    <p className="font-medium text-green-900 dark:text-green-200">{mentee}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  You are not currently mentoring anyone.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Mentorship Notes Info */}
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Mentorship Notes</h3>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {currentMember && currentMember.mentorshipNotes && currentMember.mentorshipNotes.length > 0 ? (
                <>You have <span className="font-semibold text-gray-900 dark:text-white">{currentMember.mentorshipNotes.length}</span> mentorship note{currentMember.mentorshipNotes.length > 1 ? 's' : ''} on record.</>
              ) : (
                'No mentorship notes yet. Notes will be added as you work with your mentor or mentees.'
              )}
            </p>
            {currentMember && currentMember.mentorshipNotes && currentMember.mentorshipNotes.length > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                View and manage notes through the mentorship panel in the Manage Members section.
              </p>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
            About Mentorship
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
            <li>• View all club relationships in the table below</li>
            <li>• Contact Admin or VPE to request a mentor or to mentor someone</li>
            <li>• Admin and VPE manage all mentorship pairings through the VPE Mentor Center</li>
            <li>• Use the notes section above to track your mentorship progress</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

