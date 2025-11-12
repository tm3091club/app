import React, { useEffect, useState } from 'react';
import { ChevronRight, Home, Plus } from 'lucide-react';
import * as Icons from 'lucide-react';
import { useToastmasters } from '../Context/ToastmastersContext';
import { knowledgeService, KnowledgeSection } from '../services/knowledgeService';
import { KnowledgeSectionEditor } from './common/KnowledgeSectionEditor';

// Default sections if none exist
const DEFAULT_SECTIONS: KnowledgeSection[] = [
  {
    id: 'new-member-journey',
    title: 'New Member Journey',
    description: 'Your step-by-step path from induction through your first year—what to expect, what to do, and how the club helps you grow.',
    icon: 'BookOpen',
    order: 0,
    isFeatured: true,
  },
  {
    id: 'club-overview',
    title: 'Club Overview',
    description: 'Learn about our club structure and meeting format',
    icon: 'Users',
    order: 1,
  },
  {
    id: 'current-members',
    title: 'Current Members',
    description: 'Resources for active club members',
    icon: 'Users',
    order: 2,
  },
  {
    id: 'officers-hub',
    title: 'Officers Hub',
    description: 'Leadership resources and officer responsibilities',
    icon: 'Shield',
    order: 3,
  },
  {
    id: 'roles-library',
    title: 'Roles Library',
    description: 'Comprehensive guide to all meeting roles',
    icon: 'FileText',
    order: 4,
  },
  {
    id: 'misc',
    title: 'Miscellaneous',
    description: 'Additional resources and helpful information',
    icon: 'HelpCircle',
    order: 5,
  },
];

interface KnowledgeCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  featured?: boolean;
}

const KnowledgeCard: React.FC<KnowledgeCardProps> = ({ 
  title, 
  description, 
  icon, 
  onClick, 
  featured = false,
}) => {
  return (
    <button
      onClick={onClick}
      className={`group relative w-full p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        featured ? 'border-2 border-blue-500 dark:border-blue-400' : 'border border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${
              featured 
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}>
              {icon}
            </div>
            <h3 className={`text-lg font-semibold ${
              featured 
                ? 'text-blue-700 dark:text-blue-300' 
                : 'text-gray-900 dark:text-white'
            }`}>
              {title}
            </h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 ml-12">
            {description}
          </p>
        </div>
        <ChevronRight 
          size={20} 
          className="flex-shrink-0 ml-4 text-gray-400 dark:text-gray-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" 
        />
      </div>
    </button>
  );
};

const KnowledgePage: React.FC = () => {
  const { currentUser, adminStatus, ownerId } = useToastmasters();
  const [sections, setSections] = useState<KnowledgeSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);

  const canEdit = adminStatus?.hasAdminRights || currentUser?.officerRole;

  useEffect(() => {
    if (!ownerId) return;

    const initializeSections = async () => {
      let existingSections = await knowledgeService.getSections(ownerId);
      
      // If no sections exist, create the default ones
      if (existingSections.length === 0) {
        for (const section of DEFAULT_SECTIONS) {
          await knowledgeService.saveSection(ownerId, section);
        }
        setSections(DEFAULT_SECTIONS);
        setLoading(false);
        return;
      }

      // Migration: Check if sections need isFeatured flag
      let needsUpdate = false;
      const updatedSections = existingSections.map(section => {
        if (section.isFeatured === undefined) {
          needsUpdate = true;
          // Make new-member-journey featured by default
          return { 
            ...section, 
            isFeatured: section.id === 'new-member-journey' 
          };
        }
        return section;
      });

      // If any section needed updating, save them
      if (needsUpdate) {
        for (const section of updatedSections) {
          await knowledgeService.saveSection(ownerId, section);
        }
        existingSections = updatedSections;
      }

      // Ensure new-member-journey exists
      const newMemberJourney = existingSections.find(s => s.id === 'new-member-journey');
      if (!newMemberJourney) {
        const newMemberSection = DEFAULT_SECTIONS.find(s => s.id === 'new-member-journey');
        if (newMemberSection) {
          await knowledgeService.saveSection(ownerId, newMemberSection);
          existingSections = [...existingSections, newMemberSection];
        }
      }

      setSections(existingSections);
      setLoading(false);
    };

    initializeSections();

    // Subscribe to real-time updates
    const unsubscribe = knowledgeService.subscribeSections(ownerId, (updatedSections) => {
      setSections(updatedSections);
    });

    return () => unsubscribe();
  }, [ownerId]);

  const handleAddSection = async (section: KnowledgeSection) => {
    if (!ownerId) return;
    const newOrder = sections.length > 0 ? Math.max(...sections.map(s => s.order)) + 1 : 1;
    await knowledgeService.saveSection(ownerId, { ...section, order: newOrder });
    setAddModalOpen(false);
  };

  const renderIcon = (iconName: string, size: number = 24) => {
    const IconComponent = (Icons as any)[iconName];
    return IconComponent ? <IconComponent size={size} /> : <Icons.BookOpen size={size} />;
  };

  const handleNavigation = (path: string) => {
    window.location.hash = path;
  };

  const goToMainApp = () => {
    window.location.hash = '';
  };

  // Separate featured and regular sections
  const featuredSections = sections.filter(s => s.isFeatured);
  const regularSections = sections.filter(s => !s.isFeatured);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Simple Header with Back Navigation */}
      <div className="bg-white dark:bg-gray-800 shadow-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={goToMainApp}
              className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              <Home size={20} />
              <span className="font-medium">Back to Main App</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">
              Member Resource Hub
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Your Toastmasters Journey
            </p>
          </div>

          {/* Intro Card */}
          <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-750 rounded-lg border border-blue-200 dark:border-gray-700">
            <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
              Welcome to the Knowledge Hub — your guide to how our club works, with clear resources for new members, 
              current members, officers, and role breakdowns. Start with the <strong>New Member Journey</strong> to 
              see what your first year will look like, step by step, while following our club's best practices.
            </p>
          </div>

          {/* Featured Section */}
          {featuredSections.length > 0 ? (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Start Here
              </h2>
              <div className="space-y-4">
                {featuredSections.map((section) => (
                  <KnowledgeCard
                    key={section.id}
                    title={section.title}
                    description={section.description}
                    icon={renderIcon(section.icon, 24)}
                    onClick={() => handleNavigation(`/knowledge/${section.id}`)}
                    featured={true}
                  />
                ))}
              </div>
            </div>
          ) : (
            // Show New Member Journey as featured even if not marked yet (for backward compatibility)
            sections.find(s => s.id === 'new-member-journey') && (
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Start Here
                </h2>
                <KnowledgeCard
                  title="New Member Journey"
                  description="Your step-by-step path from induction through your first year—what to expect, what to do, and how the club helps you grow."
                  icon={<Icons.BookOpen size={24} />}
                  onClick={() => handleNavigation('/knowledge/new-member-journey')}
                  featured={true}
                />
              </div>
            )
          )}

          {/* Other Sections */}
          {regularSections.filter(s => s.id !== 'new-member-journey' || featuredSections.length > 0).length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Explore More
                </h2>
                {canEdit && (
                  <button
                    onClick={() => setAddModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                  >
                    <Plus size={16} />
                    Add Section
                  </button>
                )}
              </div>
              <div className="space-y-4">
                {regularSections
                  .filter(s => s.id !== 'new-member-journey' || featuredSections.length > 0)
                  .map((section) => (
                    <KnowledgeCard
                      key={section.id}
                      title={section.title}
                      description={section.description}
                      icon={renderIcon(section.icon, 24)}
                      onClick={() => handleNavigation(`/knowledge/${section.id}`)}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Show Add Section button if no sections exist */}
          {canEdit && sections.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400 mb-4">No sections yet. Create your first one!</p>
              <button
                onClick={() => setAddModalOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Plus size={20} />
                Add Section
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Section Modal */}
      <KnowledgeSectionEditor
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSave={handleAddSection}
        isNewSection={true}
      />
    </div>
  );
};

export default KnowledgePage;
