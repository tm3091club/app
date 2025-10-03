import React, { useEffect, useState } from 'react';
import { mentorshipService } from '../../services/mentorshipService';
import { useToastmasters } from '../../Context/ToastmastersContext';
import { MentorshipPair, Member } from '../../types';
import MyMentorshipNotes from './MyMentorshipNotes';

interface MentorshipPanelProps {
  memberId: string;
  memberName: string;
}

export default function MentorshipPanel({ memberId, memberName }: MentorshipPanelProps) {
  const { organization, currentUser } = useToastmasters();
  const [pairs, setPairs] = useState<MentorshipPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNotes, setShowNotes] = useState(false);
  const [selectedPair, setSelectedPair] = useState<MentorshipPair | null>(null);

  const isAdmin = currentUser?.role === 'Admin';

  useEffect(() => {
    if (!organization) return;
    
    loadPairs();
  }, [organization, memberId]);

  const loadPairs = async () => {
    if (!organization) return;
    
    try {
      const memberPairs = await mentorshipService.getPairsForMember(organization.ownerId, memberId);
      setPairs(memberPairs.filter(pair => pair.active));
    } catch (error) {
      console.error('Error loading mentorship pairs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMemberName = (memberId: string): string => {
    if (!organization) return 'Unknown';
    const member = organization.members.find(m => m.id === memberId);
    return member?.name || 'Unknown';
  };

  const openNotes = (pair: MentorshipPair) => {
    setSelectedPair(pair);
    setShowNotes(true);
  };

  const closeNotes = () => {
    setShowNotes(false);
    setSelectedPair(null);
  };

  if (loading) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <div className="text-gray-600 dark:text-gray-400 text-sm">Loading mentorship info...</div>
      </div>
    );
  }

  // Filter relationships where this member is the mentee (mentors)
  const mentorPairs = pairs.filter(pair => pair.menteeId === memberId);
  // Filter relationships where this member is the mentor (mentees)
  const menteePairs = pairs.filter(pair => pair.mentorId === memberId);

  return (
    <div className="mt-6">
      {/* Mentors Section */}
      <div className="mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Mentors
        </h2>
        {mentorPairs.length > 0 ? (
          <div className="space-y-3">
            {mentorPairs.map((pair, index) => {
                const mentorName = getMemberName(pair.mentorId);
                
                return (
                  <div key={pair.id || `mentor-${index}`} className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {mentorName}
                    </div>
                    
                    <button
                      onClick={() => openNotes(pair)}
                      className="inline-flex items-center justify-center bg-[#004165] hover:bg-[#003554] text-white font-bold py-2 px-4 rounded-md transition duration-150"
                    >
                      Notes
                    </button>
                  </div>
                );
              })}
          </div>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No assigned Mentor
          </p>
        )}
      </div>

      {/* Mentees Section */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Mentees
        </h2>
        {menteePairs.length > 0 ? (
          <div className="space-y-3">
            {menteePairs.map((pair, index) => {
                const menteeName = getMemberName(pair.menteeId);
                
                return (
                  <div key={pair.id || `mentee-${index}`} className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {menteeName}
                    </div>
                    
                    <button
                      onClick={() => openNotes(pair)}
                      className="inline-flex items-center justify-center bg-[#004165] hover:bg-[#003554] text-white font-bold py-2 px-4 rounded-md transition duration-150"
                    >
                      Notes
                    </button>
                  </div>
                );
              })}
          </div>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            You are not currently mentoring anyone
          </p>
        )}
      </div>

      {/* Notes Modal */}
      {showNotes && selectedPair && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <MyMentorshipNotes
                mentorId={selectedPair.mentorId}
                menteeId={selectedPair.menteeId}
                recipientName={selectedPair.mentorId === memberId ? getMemberName(selectedPair.menteeId) : getMemberName(selectedPair.mentorId)}
                recipientUid={selectedPair.mentorId === memberId ? 
                  organization?.members.find(m => m.id === selectedPair.menteeId)?.uid || '' :
                  organization?.members.find(m => m.id === selectedPair.mentorId)?.uid || ''}
                isRecipientMentor={selectedPair.mentorId !== memberId}
                onClose={closeNotes}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
