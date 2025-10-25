import React, { useState, useEffect } from 'react';
import { useToastmasters } from '../../Context/ToastmastersContext';
import { db } from '../../services/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { MentorshipPair } from '../../types';
import MyMentorshipNotes from './MyMentorshipNotes';

interface MyMentorshipSectionProps {
  currentUserId: string;
  currentMemberId: string;
  showButtons?: boolean;
  onShowGuide?: () => void;
  onShowVPECenter?: () => void;
  showVPECenter?: boolean;
  adminStatus?: any;
  currentUser?: any;
}

interface MenteeWithId {
  name: string;
  id: string;
  uid?: string;
  pairingMentorId?: string;
  pairingMenteeId?: string;
}

export const MyMentorshipSection: React.FC<MyMentorshipSectionProps> = ({ 
  currentUserId, 
  currentMemberId,
  showButtons = false,
  onShowGuide,
  onShowVPECenter,
  showVPECenter = false,
  adminStatus,
  currentUser
}) => {
  const { organization } = useToastmasters();
  const [myMentors, setMyMentors] = useState<MenteeWithId[]>([]);
  const [myMentees, setMyMentees] = useState<MenteeWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNotes, setShowNotes] = useState(false);
  const [notesRecipient, setNotesRecipient] = useState<MenteeWithId | null>(null);

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
        
        // Find my mentors (where I am the mentee)
        const mentorPairings = pairings.filter(p => p.menteeId === currentMemberId);
        const mentorsList = mentorPairings
          .map(p => {
            const mentorMember = organization.members.find(m => m.id === p.mentorId);
            return mentorMember ? { 
              name: mentorMember.name, 
              id: mentorMember.id, 
              uid: mentorMember.uid,
              pairingMentorId: p.mentorId,
              pairingMenteeId: p.menteeId
            } : null;
          })
          .filter(Boolean) as MenteeWithId[];
        setMyMentors(mentorsList);
        
        // Find my mentees (where I am the mentor)
        const menteePairings = pairings.filter(p => p.mentorId === currentMemberId);
        const menteesList = menteePairings
          .map(p => {
            const menteeMember = organization.members.find(m => m.id === p.menteeId);
            return menteeMember ? { 
              name: menteeMember.name, 
              id: menteeMember.id, 
              uid: menteeMember.uid,
              pairingMentorId: p.mentorId,
              pairingMenteeId: p.menteeId
            } : null;
          })
          .filter(Boolean) as MenteeWithId[];
        setMyMentees(menteesList);
        
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
        <div className="flex flex-col">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">My Mentorship</h2>
          {showButtons && (
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={onShowGuide}
                className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Learn about Mentoring
              </button>
              {(adminStatus?.hasAdminRights && (currentUser?.role === 'Admin' || currentUser?.officerRole === 'Vice President Education')) && (
                <button 
                  onClick={onShowVPECenter}
                  className="px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  {showVPECenter ? 'Back to Mentorship' : 'VPE Mentor Center'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* My Mentors */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              My Mentors
            </h3>
            {myMentors.length > 0 ? (
              <div className="space-y-2">
                {myMentors.map((mentor, index) => (
                  <div 
                    key={index} 
                    className="p-3 bg-blue-50 dark:!bg-gray-700 rounded-lg"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <p className="font-medium text-blue-900 dark:!text-gray-200">{mentor.name}</p>
                      <button
                        onClick={() => {
                          setNotesRecipient(mentor);
                          setShowNotes(true);
                        }}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded flex items-center gap-1 w-full sm:w-auto justify-center"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Notes
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  No assigned mentors. Contact Admin or VPE to request a mentor.
                </p>
              </div>
            )}
          </div>

          {/* My Mentees */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              My Mentees
            </h3>
            {myMentees.length > 0 ? (
              <div className="space-y-2">
                {myMentees.map((mentee, index) => (
                  <div 
                    key={index} 
                    className="p-3 bg-green-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <p className="font-medium text-green-900 dark:text-gray-200">{mentee.name}</p>
                      <button
                        onClick={() => {
                          setNotesRecipient(mentee);
                          setShowNotes(true);
                        }}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded flex items-center gap-1 w-full sm:w-auto justify-center"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Notes
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  You are not currently mentoring anyone.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 p-3 bg-blue-50 dark:!bg-gray-700 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 dark:!text-gray-200 mb-2">
            Mentorship
          </h4>
          <ul className="text-sm text-blue-800 dark:!text-gray-300 space-y-1">
            <li>• View all mentor/mentee relationships below</li>
            <li>• Contact the VPE to assign you a Mentor or Mentee.</li>
            <li>• Use the "Notes" button to keep private notes with each mentor/mentee.</li>
          </ul>
        </div>
      </div>

      {/* Notes Modal */}
      {showNotes && notesRecipient && notesRecipient.uid && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <MyMentorshipNotes
                mentorId={notesRecipient.pairingMentorId || ''}
                menteeId={notesRecipient.pairingMenteeId || ''}
                recipientName={notesRecipient.name}
                recipientUid={notesRecipient.uid || ''}
                isRecipientMentor={myMentors.some(m => m.id === notesRecipient.id)}
                onClose={() => {
                  setShowNotes(false);
                  setNotesRecipient(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

