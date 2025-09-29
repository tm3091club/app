import React, { useEffect, useState } from 'react';
import { mentorshipService } from '../../services/mentorshipService';
import { useToastmasters } from '../../Context/ToastmastersContext';
import { MentorshipPair, Member } from '../../types';

export default function MentorshipManager() {
  const { organization, currentUser } = useToastmasters();
  const [pairs, setPairs] = useState<MentorshipPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedMentor, setSelectedMentor] = useState('');
  const [selectedMentee, setSelectedMentee] = useState('');

  const isAdmin = currentUser?.role === 'Admin';

  useEffect(() => {
    if (!organization || !isAdmin) return;
    
    loadPairs();
  }, [organization, isAdmin]);

  const loadPairs = async () => {
    if (!organization) return;
    
    try {
      const allPairs = await mentorshipService.getAllPairs(organization.ownerId);
      setPairs(allPairs.filter(pair => pair.active));
    } catch (error) {
      console.error('Error loading pairs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getQualifiedMentors = (): Member[] => {
    if (!organization) return [];
    
    return organization.members.filter(member => 
      member.status === 'Active' && 
      (member.isPastPresident || member.isToastmaster || member.isGeneralEvaluator)
    );
  };

  const getAvailableMentees = (): Member[] => {
    if (!organization) return [];
    
    const mentorIds = pairs.map(pair => pair.mentorId);
    const menteeIds = pairs.map(pair => pair.menteeId);
    
    return organization.members.filter(member => 
      member.status === 'Active' && 
      !mentorIds.includes(member.id) && 
      !menteeIds.includes(member.id)
    );
  };

  const createPair = async () => {
    if (!organization || !selectedMentor || !selectedMentee) return;
    
    try {
      await mentorshipService.upsertPair(organization.ownerId, selectedMentor, selectedMentee);
      setSelectedMentor('');
      setSelectedMentee('');
      setShowCreateForm(false);
      await loadPairs();
    } catch (error) {
      console.error('Error creating pair:', error);
    }
  };

  const deactivatePair = async (pairId: string) => {
    if (!organization) return;
    
    try {
      await mentorshipService.deactivatePair(organization.ownerId, pairId);
      await loadPairs();
    } catch (error) {
      console.error('Error deactivating pair:', error);
    }
  };

  const getMemberName = (memberId: string): string => {
    if (!organization) return 'Unknown';
    const member = organization.members.find(m => m.id === memberId);
    return member?.name || 'Unknown';
  };

  if (!isAdmin) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Access denied. Only administrators can manage mentorship pairs.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-gray-600 dark:text-gray-400">Loading mentorship pairs...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Mentorship Management
        </h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-[#004165] hover:bg-[#003554] text-white font-semibold py-2 px-4 rounded text-sm"
        >
          {showCreateForm ? 'Cancel' : 'Create Pair'}
        </button>
      </div>

      {/* Create Pair Form */}
      {showCreateForm && (
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Create New Mentorship Pair</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Mentor (Past President, Toastmaster, or General Evaluator)
              </label>
              <select
                value={selectedMentor}
                onChange={e => setSelectedMentor(e.target.value)}
                className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Choose a mentor...</option>
                {getQualifiedMentors().map(mentor => (
                  <option key={mentor.id} value={mentor.id}>
                    {mentor.name} {mentor.isPastPresident ? '(Past President)' : ''}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Mentee (Available Member)
              </label>
              <select
                value={selectedMentee}
                onChange={e => setSelectedMentee(e.target.value)}
                className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Choose a mentee...</option>
                {getAvailableMentees().map(mentee => (
                  <option key={mentee.id} value={mentee.id}>
                    {mentee.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={createPair}
              disabled={!selectedMentor || !selectedMentee}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded text-sm"
            >
              Create Pair
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false);
                setSelectedMentor('');
                setSelectedMentee('');
              }}
              className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Pairs List */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Active Mentorship Pairs ({pairs.length})
        </h3>
        
        {pairs.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No active mentorship pairs. Create the first pair above.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pairs.map(pair => (
              <div key={pair.id} className="bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {getMemberName(pair.mentorId)}
                      </span>
                      <span className="text-gray-400">↔</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {getMemberName(pair.menteeId)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Created: {pair.createdAt ? new Date(pair.createdAt).toLocaleDateString() : 'Unknown'}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => deactivatePair(pair.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Deactivate
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Mentorship Summary</h4>
        <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <div>• Active pairs: {pairs.length}</div>
          <div>• Available mentors: {getQualifiedMentors().length}</div>
          <div>• Available mentees: {getAvailableMentees().length}</div>
        </div>
      </div>
    </div>
  );
}
