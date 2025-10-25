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

    // Watch notifications for current user; avoid composite index by filtering type client-side
    const notificationsRef = collection(db, 'users', currentUser.uid, 'notifications');
    const q = query(
      notificationsRef,
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifications: Notification[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const isMentorshipNote = data.type === NotificationType.MentorshipNote;
        // Show notes belonging to this mentor/mentee pairing
        const isPartOfThisConversation =
          data.metadata?.mentorId === mentorId &&
          data.metadata?.menteeId === menteeId;

        if (isMentorshipNote && isPartOfThisConversation) {
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
            metadata: data.metadata,
          });
        }
      });
      // Newest first
      notifications.sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));
      setNotes(notifications);
    });

    return () => unsubscribe();
  }, [currentUser?.uid, mentorId, menteeId]);

  const addNote = async () => {
    if (!organization || !currentUser?.uid || !text.trim() || !subject.trim()) return;
    
    setLoading(true);
    try {
      const currentMember = organization.members.find(m => m.uid === currentUser.uid);
      const senderName = currentMember?.name || 'Unknown';
      const now = new Date();
      
      // Optimistically add the note to the UI immediately
      const optimisticNote: Notification = {
        id: `temp-${Date.now()}`,
        userId: currentUser.uid,
        type: NotificationType.MentorshipNote,
        title: `${subject} - Note to ${recipientName}`,
        message: text.trim(),
        createdAt: now,
        isRead: true,
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
      
  // Put newest at top optimistically
  setNotes(prev => [optimisticNote, ...prev]);
      
      // Reset form immediately for better UX
      const noteText = text.trim();
      const noteSubject = subject.trim();
      setText('');
      setSubject('');
      
      // Create notification for recipient
      const recipientNotificationData = {
        userId: recipientUid,
        type: NotificationType.MentorshipNote,
        title: `${noteSubject} - Note from ${senderName}`,
        message: noteText,
        createdAt: serverTimestamp(),
        isRead: false,
        metadata: {
          mentorId,
          menteeId,
          senderUid: currentUser.uid,
          senderName,
          recipientUid,
          recipientName,
          subject: noteSubject,
        }
      };
      
      // Save notification to recipient's collection (only if mentor has a linked account)
      if (recipientUid) {
        await addDoc(
          collection(db, 'users', recipientUid, 'notifications'),
          recipientNotificationData
        );
      }
      
      // Also save a copy to sender's notifications for record keeping
      const senderNotificationData = {
        userId: currentUser.uid,
        type: NotificationType.MentorshipNote,
        title: `${noteSubject} - Note to ${recipientName}`,
        message: noteText,
        createdAt: serverTimestamp(),
        isRead: true, // Mark as read since sender created it
        metadata: {
          mentorId,
          menteeId,
          senderUid: currentUser.uid,
          senderName,
          recipientUid,
          recipientName,
          subject: noteSubject,
        }
      };
      
      await addDoc(
        collection(db, 'users', currentUser.uid, 'notifications'),
        senderNotificationData
      );
      
    } catch (error) {
      console.error('Error adding note:', error);
      // If there's an error, the real-time listener will sync the correct state
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
          notes.map((note, index) => {
            // Extract subject from title (format: "Subject - Note from/to Name")
            const subjectMatch = note.title.match(/^(.+?)\s*-\s*/);
            const subject = subjectMatch ? subjectMatch[1] : note.title;
            
            // Extract sender name from metadata or title
            const senderName = note.metadata?.senderName || 'Unknown';
            
            // Check if this is the current user's note
            const isCurrentUser = note.metadata?.senderUid === currentUser?.uid;
            
            return (
              <div key={note.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-4 rounded-lg ${
                  isCurrentUser 
                    ? 'bg-blue-600 text-white ml-8' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white mr-8'
                }`}>
                  {/* Header with sender name, subject, and timestamp */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold text-sm ${
                        isCurrentUser ? 'text-blue-100' : 'text-gray-900 dark:text-white'
                      }`}>
                        {senderName}
                      </span>
                      <span className={`text-xs ${
                        isCurrentUser ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        •
                      </span>
                      <span className={`text-xs font-medium ${
                        isCurrentUser ? 'text-blue-200' : 'text-blue-600 dark:text-blue-400'
                      }`}>
                        {subject}
                      </span>
                    </div>
                    <span className={`text-xs ${
                      isCurrentUser ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'
                    } ml-3 flex-shrink-0`}>
                      {formatDate(note.createdAt)}
                    </span>
                  </div>
                  
                  {/* Message content */}
                  <div className={`whitespace-pre-wrap text-sm leading-relaxed ${
                    isCurrentUser ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {note.message}
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

