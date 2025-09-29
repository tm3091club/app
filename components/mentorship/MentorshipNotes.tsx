import React, { useEffect, useState } from 'react';
import { mentorshipService } from '../../services/mentorshipService';
import { useToastmasters } from '../../Context/ToastmastersContext';
import { MentorshipNote, MentorshipNoteType, MentorshipNoteVisibility, MentorshipPair } from '../../types';

interface MentorshipNotesProps {
  mentorId: string;
  menteeId: string;
  mentorName: string;
  menteeName: string;
  onClose?: () => void;
}

export default function MentorshipNotes({ 
  mentorId, 
  menteeId, 
  mentorName, 
  menteeName, 
  onClose 
}: MentorshipNotesProps) {
  const { organization, currentUser } = useToastmasters();
  const [notes, setNotes] = useState<MentorshipNote[]>([]);
  const [pair, setPair] = useState<MentorshipPair | null>(null);
  const [text, setText] = useState('');
  const [type, setType] = useState<MentorshipNoteType>('session');
  const [visibility, setVisibility] = useState<MentorshipNoteVisibility>('both');
  const [goals, setGoals] = useState<string[]>([]);
  const [goalInput, setGoalInput] = useState('');
  const [status, setStatus] = useState<'open' | 'in_progress' | 'done'>('open');
  const [meetingDate, setMeetingDate] = useState('');
  const [linkedRole, setLinkedRole] = useState('');
  const [loading, setLoading] = useState(false);

  const isAdmin = currentUser?.role === 'Admin';

  useEffect(() => {
    if (!organization) return;
    
    const pairId = mentorshipService.pairId(mentorId, menteeId);
    
    // Get pair info
    mentorshipService.getPair(organization.ownerId, pairId).then(setPair);
    
    // Watch notes
    return mentorshipService.watchNotes(organization.ownerId, pairId, (newNotes) => {
      // Filter notes based on visibility permissions
      const filteredNotes = newNotes.filter(note => 
        mentorshipService.canViewNote(note, currentUser?.uid || '', isAdmin, {
          mentorId,
          menteeId,
          id: pairId,
          active: true,
          createdAt: null
        })
      );
      setNotes(filteredNotes);
    });
  }, [organization, mentorId, menteeId, currentUser?.uid, isAdmin]);

  const addGoal = () => {
    if (goalInput.trim() && !goals.includes(goalInput.trim())) {
      setGoals([...goals, goalInput.trim()]);
      setGoalInput('');
    }
  };

  const removeGoal = (goalToRemove: string) => {
    setGoals(goals.filter(g => g !== goalToRemove));
  };

  const addNote = async () => {
    if (!organization || !currentUser?.uid || !text.trim()) return;
    
    setLoading(true);
    try {
      const pairId = mentorshipService.pairId(mentorId, menteeId);
      
      const noteData: Omit<MentorshipNote, 'id' | 'createdAt'> = {
        createdByUid: currentUser.uid,
        text: text.trim(),
        type,
        visibility,
        ...(goals.length > 0 && { goals }),
        ...(type === 'goal' && { status }),
        ...(meetingDate && { meetingDate }),
        ...(linkedRole && { linkedRole }),
      };
      
      await mentorshipService.addNote(organization.ownerId, pairId, noteData);
      
      // Reset form
      setText('');
      setGoals([]);
      setGoalInput('');
      setMeetingDate('');
      setLinkedRole('');
      setStatus('open');
    } catch (error) {
      console.error('Error adding note:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  const getTypeColor = (type: MentorshipNoteType) => {
    const colors = {
      session: 'bg-blue-100 text-blue-800',
      goal: 'bg-green-100 text-green-800',
      feedback: 'bg-yellow-100 text-yellow-800',
      milestone: 'bg-purple-100 text-purple-800',
      general: 'bg-gray-100 text-gray-800'
    };
    return colors[type] || colors.general;
  };

  const getVisibilityColor = (visibility: MentorshipNoteVisibility) => {
    const colors = {
      mentor: 'bg-orange-100 text-orange-800',
      mentee: 'bg-cyan-100 text-cyan-800',
      both: 'bg-indigo-100 text-indigo-800',
      officers: 'bg-red-100 text-red-800'
    };
    return colors[visibility] || colors.both;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Mentorship Notes
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {mentorName} ↔ {menteeName}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ✕
          </button>
        )}
      </div>

      {/* Add Note Form */}
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <select 
            value={type} 
            onChange={e => setType(e.target.value as MentorshipNoteType)} 
            className="border rounded px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="session">Session</option>
            <option value="goal">Goal</option>
            <option value="feedback">Feedback</option>
            <option value="milestone">Milestone</option>
            <option value="general">General</option>
          </select>
          
          <select 
            value={visibility} 
            onChange={e => setVisibility(e.target.value as MentorshipNoteVisibility)} 
            className="border rounded px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="both">Mentor & Mentee</option>
            <option value="mentor">Mentor-only</option>
            <option value="mentee">Mentee-only</option>
            <option value="officers">Officers-only</option>
          </select>
        </div>

        {type === 'goal' && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Status
            </label>
            <select 
              value={status} 
              onChange={e => setStatus(e.target.value as 'open' | 'in_progress' | 'done')}
              className="border rounded px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>
        )}

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          rows={3}
          placeholder="Add a quick note…"
        />

        {/* Goals for goal-type notes */}
        {type === 'goal' && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Goals
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={goalInput}
                onChange={e => setGoalInput(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addGoal())}
                placeholder="Add a goal..."
                className="flex-1 border rounded px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <button
                type="button"
                onClick={addGoal}
                className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white"
              >
                Add
              </button>
            </div>
            {goals.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {goals.map((goal, index) => (
                  <span
                    key={goal || `goal-${index}`}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded dark:bg-blue-900 dark:text-blue-200"
                  >
                    {goal}
                    <button
                      type="button"
                      onClick={() => removeGoal(goal)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-300"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <button 
          onClick={addNote} 
          disabled={loading || !text.trim()}
          className="w-full bg-[#004165] hover:bg-[#003554] disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded text-sm"
        >
          {loading ? 'Adding...' : 'Add Note'}
        </button>
      </div>

      {/* Notes List */}
      <div className="space-y-3">
        {notes.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
            No notes yet. Add the first note above.
          </p>
        ) : (
          notes.map(note => (
            <div key={note.id} className="bg-white dark:bg-gray-700 p-4 rounded-lg border dark:border-gray-600">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-1 text-xs font-medium rounded ${getTypeColor(note.type)}`}>
                  {note.type}
                </span>
                <span className={`px-2 py-1 text-xs font-medium rounded ${getVisibilityColor(note.visibility)}`}>
                  {note.visibility}
                </span>
                {note.status && (
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    note.status === 'done' ? 'bg-green-100 text-green-800' :
                    note.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {note.status}
                  </span>
                )}
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                  {formatDate(note.createdAt)}
                </span>
              </div>
              
              <div className="whitespace-pre-wrap text-sm text-gray-900 dark:text-white mb-2">
                {note.text}
              </div>
              
              {note.goals && note.goals.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Goals:</div>
                  <div className="flex flex-wrap gap-1">
                    {note.goals.map((goal, index) => (
                      <span
                        key={goal || `note-goal-${index}`}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded dark:bg-blue-900 dark:text-blue-200"
                      >
                        {goal}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {(note.meetingDate || note.linkedRole) && (
                <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                  {note.meetingDate && <div>Meeting: {note.meetingDate}</div>}
                  {note.linkedRole && <div>Role: {note.linkedRole}</div>}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
