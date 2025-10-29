import React, { useEffect, useState } from 'react';
import { useToastmasters } from '../../Context/ToastmastersContext';
import { MentorshipNote } from '../../types';
import { db, FieldValue } from '../../services/firebase';

interface MyMentorshipNotesProps {
  mentorId: string;
  menteeId: string;
  recipientName: string;
  recipientUid: string;
  isRecipientMentor: boolean;
  onClose?: () => void;
}

const SUBJECT_OPTIONS = [
  'Session',
  'Goal',
  'Feedback',
  'Milestone',
  'General'
];

export default function MyMentorshipNotes({ 
  mentorId, 
  menteeId, 
  recipientName,
  recipientUid,
  isRecipientMentor,
  onClose 
}: MyMentorshipNotesProps) {
  const { organization, currentUser, ownerId } = useToastmasters();
  const [notes, setNotes] = useState<MentorshipNote[]>([]);
  const [text, setText] = useState('');
  const [subject, setSubject] = useState('');
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  const isAdmin = currentUser?.role === 'Admin';
  
  // Create pairId using mentor and mentee IDs
  const pairId = `${mentorId}_${menteeId}`;

  useEffect(() => {
    if (!ownerId || !pairId) return;

    // Watch mentorship notes for this pairing in the club's mentorship collection
    const notesRef = db.collection('users').doc(ownerId)
      .collection('mentorship').doc('mentorshipPairs')
      .collection('pairs').doc(pairId)
      .collection('notes');

    const unsubscribe = notesRef
      .orderBy('createdAt', 'desc')
      .onSnapshot((snapshot) => {
        const mentorshipNotes: MentorshipNote[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          mentorshipNotes.push({
            id: doc.id,
            createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
            createdByUid: data.createdByUid,
            visibility: data.visibility || 'both',
            type: data.type || 'general',
            text: data.text,
            goals: data.goals,
            status: data.status,
            meetingDate: data.meetingDate,
            linkedRole: data.linkedRole,
          });
        });
        setNotes(mentorshipNotes);
      });

    return () => unsubscribe();
  }, [ownerId, pairId]);

  const addNote = async () => {
    if (!ownerId || !currentUser?.uid || !text.trim() || !subject.trim()) return;
    
    setLoading(true);
    try {
      const currentMember = organization?.members.find(m => m.uid === currentUser.uid);
      const senderName = currentMember?.name || 'Unknown';
      
      // Save note to the mentorship collection under the club
      const notesRef = db.collection('users').doc(ownerId)
        .collection('mentorship').doc('mentorshipPairs')
        .collection('pairs').doc(pairId)
        .collection('notes');
      
      const noteDoc = notesRef.doc();
      
      await noteDoc.set({
        id: noteDoc.id,
        createdAt: FieldValue.serverTimestamp(),
        createdByUid: currentUser.uid,
        visibility: 'both',
        type: subject.toLowerCase() === 'session' ? 'session' : 
              subject.toLowerCase() === 'goal' ? 'goal' :
              subject.toLowerCase() === 'feedback' ? 'feedback' :
              subject.toLowerCase() === 'milestone' ? 'milestone' : 'general',
        text: `**${subject}** - ${senderName}\n\n${text.trim()}`,
      });
      
      // Reset form
      setText('');
      setSubject('');
      
    } catch (error) {
      console.error('Error adding note:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | any) => {
    if (!date) return '';
    const d = date instanceof Date ? date : date.toDate?.() || new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
            Notes with your {isRecipientMentor ? 'Mentor' : 'Mentee'}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">{recipientName}</span> • Only you and your {isRecipientMentor ? 'Mentor' : 'Mentee'} can read these
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Add Note Form */}
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-3">
        {/* Subject Field with Dropdown */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Subject
          </label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            onFocus={() => setShowSubjectDropdown(true)}
            onBlur={() => setTimeout(() => setShowSubjectDropdown(false), 200)}
            className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="Type or select a subject..."
          />
          {showSubjectDropdown && (
            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded shadow-lg">
              {SUBJECT_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setSubject(option);
                    setShowSubjectDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-white"
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Note Text */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Note
          </label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            rows={3}
            placeholder="Write your note..."
          />
        </div>

        <button 
          onClick={addNote} 
          disabled={loading || !text.trim() || !subject.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded text-sm"
        >
          {loading ? 'Sending...' : 'Send Note'}
        </button>
      </div>

      {/* Notes List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {notes.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-8">
            No notes yet. Add your first note above.
          </p>
        ) : (
          notes.map((note) => {
            // Extract subject and sender from the formatted text
            const textLines = note.text.split('\n');
            const firstLine = textLines[0] || '';
            const subjectMatch = firstLine.match(/^\*\*(.+?)\*\*\s*-\s*(.+)$/);
            const noteSubject = subjectMatch ? subjectMatch[1] : note.type;
            const senderName = subjectMatch ? subjectMatch[2] : 'Unknown';
            const noteContent = textLines.slice(2).join('\n'); // Skip first line and empty line
            
            // Check if this is the current user's note
            const isCurrentUserNote = note.createdByUid === currentUser?.uid;
            
            return (
              <div key={note.id} className={`flex ${isCurrentUserNote ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-4 rounded-lg ${
                  isCurrentUserNote 
                    ? 'bg-blue-600 text-white ml-8' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white mr-8'
                }`}>
                  {/* Header with sender name, subject, and timestamp */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold text-sm ${
                        isCurrentUserNote ? 'text-blue-100' : 'text-gray-900 dark:text-white'
                      }`}>
                        {senderName}
                      </span>
                      <span className={`text-xs ${
                        isCurrentUserNote ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        •
                      </span>
                      <span className={`text-xs font-medium ${
                        isCurrentUserNote ? 'text-blue-200' : 'text-blue-600 dark:text-blue-400'
                      }`}>
                        {noteSubject}
                      </span>
                    </div>
                    <span className={`text-xs ${
                      isCurrentUserNote ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'
                    } ml-3 flex-shrink-0`}>
                      {formatDate(note.createdAt)}
                    </span>
                  </div>
                  
                  {/* Message content */}
                  <div className={`whitespace-pre-wrap text-sm leading-relaxed ${
                    isCurrentUserNote ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {noteContent}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

