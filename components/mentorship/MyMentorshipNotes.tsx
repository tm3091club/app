import React, { useEffect, useState } from 'react';
import { useToastmasters } from '../../Context/ToastmastersContext';
import { Notification, NotificationType } from '../../types';
import { db } from '../../services/firebase';
import { collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp } from 'firebase/firestore';

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
  const { organization, currentUser } = useToastmasters();
  const [notes, setNotes] = useState<Notification[]>([]);
  const [text, setText] = useState('');
  const [subject, setSubject] = useState('');
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  const isAdmin = currentUser?.role === 'Admin';

  useEffect(() => {
    if (!currentUser?.uid) return;
    
    // Watch notifications for current user that are mentorship notes
    const notificationsRef = collection(db, 'users', currentUser.uid, 'notifications');
    const q = query(
      notificationsRef,
      where('type', '==', NotificationType.MentorshipNote),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifications: Notification[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Show all notes in this specific mentor-mentee relationship
        // Check if this note belongs to the conversation between these two people
        const isPartOfThisConversation = 
          data.metadata?.mentorId === mentorId && 
          data.metadata?.menteeId === menteeId;
        
        if (isPartOfThisConversation) {
          notifications.push({
            id: doc.id,
            userId: data.userId,
            type: data.type,
            title: data.title,
            message: data.message,
            createdAt: data.createdAt?.toDate() || new Date(),
            isRead: data.isRead || false,
            readAt: data.readAt?.toDate(),
            isDismissed: data.isDismissed,
            dismissedAt: data.dismissedAt?.toDate(),
          });
        }
      });
      setNotes(notifications);
    });
    
    return () => unsubscribe();
  }, [currentUser?.uid, recipientUid, mentorId, menteeId, isAdmin]);

  const addNote = async () => {
    if (!organization || !currentUser?.uid || !text.trim() || !subject.trim()) return;
    
    setLoading(true);
    try {
      const currentMember = organization.members.find(m => m.uid === currentUser.uid);
      const senderName = currentMember?.name || 'Unknown';
      
      // Create notification for recipient
      const recipientNotificationData = {
        userId: recipientUid,
        type: NotificationType.MentorshipNote,
        title: `${subject} - Note from ${senderName}`,
        message: text.trim(),
        createdAt: serverTimestamp(),
        isRead: false,
        metadata: {
          mentorId,
          menteeId,
          senderUid: currentUser.uid,
          senderName,
          recipientUid,
          recipientName,
          subject: subject.trim(),
        }
      };
      
      // Save notification to recipient's collection
      await addDoc(
        collection(db, 'users', recipientUid, 'notifications'),
        recipientNotificationData
      );
      
      // Also save a copy to sender's notifications for record keeping
      const senderNotificationData = {
        userId: currentUser.uid,
        type: NotificationType.MentorshipNote,
        title: `${subject} - Note to ${recipientName}`,
        message: text.trim(),
        createdAt: serverTimestamp(),
        isRead: true, // Mark as read since sender created it
        metadata: {
          mentorId,
          menteeId,
          senderUid: currentUser.uid,
          senderName,
          recipientUid,
          recipientName,
          subject: subject.trim(),
        }
      };
      
      await addDoc(
        collection(db, 'users', currentUser.uid, 'notifications'),
        senderNotificationData
      );
      
      // Reset form
      setText('');
      setSubject('');
    } catch (error) {
      console.error('Error adding note:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    if (!date) return '';
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Notes with your {isRecipientMentor ? 'Mentor' : 'Mentee'} ({recipientName})
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Only you and your {isRecipientMentor ? 'Mentor' : 'Mentee'} can read these
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
          <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
            No notes yet. Add your first note above.
          </p>
        ) : (
          notes.map(note => {
            // Extract subject from title (format: "Subject - Note from/to Name")
            const subjectMatch = note.title.match(/^(.+?)\s*-\s*/);
            const subject = subjectMatch ? subjectMatch[1] : note.title;
            
            return (
              <div key={note.id} className="bg-white dark:bg-gray-700 p-4 rounded-lg border dark:border-gray-600">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {subject}
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                    {formatDate(note.createdAt)}
                  </span>
                </div>
                
                <div className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 mt-2">
                  {note.message}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

