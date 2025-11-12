import React, { useState, useEffect } from 'react';
import { ArrowLeft, Edit2, Settings } from 'lucide-react';
import { useToastmasters } from '../../Context/ToastmastersContext';
import { knowledgeService, KnowledgeSection } from '../../services/knowledgeService';
import { KnowledgeEditorModal } from './KnowledgeEditorModal';
import { KnowledgeSectionEditor } from './KnowledgeSectionEditor';

interface EditableKnowledgePageProps {
  pageId: string;
  pageTitle: string;
  defaultContent: string; // Fallback content if none exists in DB
  children?: React.ReactNode;
}

export const EditableKnowledgePage: React.FC<EditableKnowledgePageProps> = ({
  pageId,
  pageTitle,
  defaultContent,
  children,
}) => {
  const { ownerId, adminStatus, currentUser } = useToastmasters();
  const [content, setContent] = useState<string>(defaultContent);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingSection, setIsEditingSection] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentSection, setCurrentSection] = useState<KnowledgeSection | null>(null);

  // Check if user can edit (admin or officer)
  const canEdit = adminStatus?.hasAdminRights || currentUser?.officerRole;

  useEffect(() => {
    if (!ownerId) return;

    // Load section metadata
    const loadSection = async () => {
      const sections = await knowledgeService.getSections(ownerId);
      const section = sections.find(s => s.id === pageId);
      if (section) {
        setCurrentSection(section);
      } else {
        // If no section exists for this page (like new-member-journey), create a default one
        const defaultSection: KnowledgeSection = {
          id: pageId,
          title: pageTitle,
          description: '',
          icon: 'BookOpen',
          order: 0,
          isFeatured: pageId === 'new-member-journey', // Default featured for new member journey
        };
        setCurrentSection(defaultSection);
      }
    };

    loadSection();

    // Subscribe to content changes
    const unsubscribe = knowledgeService.subscribeToContent(
      ownerId,
      pageId,
      (knowledgeContent) => {
        if (knowledgeContent) {
          setContent(knowledgeContent.content);
        } else {
          setContent(defaultContent);
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [ownerId, pageId, defaultContent]);

  const handleSave = async (newContent: string) => {
    if (!ownerId || !currentUser?.email) return;

    await knowledgeService.saveContent(
      ownerId,
      pageId,
      currentSection?.title || pageTitle,
      newContent,
      currentUser.email
    );
  };

  const handleSaveSection = async (section: Omit<KnowledgeSection, 'order'> & { order?: number }) => {
    if (!ownerId || !currentSection) return;
    
    // Preserve the existing order if not provided
    const updatedSection: KnowledgeSection = {
      ...section,
      order: section.order ?? currentSection.order,
    };
    
    await knowledgeService.saveSection(ownerId, updatedSection);
    setCurrentSection(updatedSection);
    setIsEditingSection(false);
  };

  const handleDeleteSection = async () => {
    if (!ownerId || !currentSection) return;
    
    const confirmText = prompt('To delete this section, type "delete" to confirm:');
    if (confirmText?.toLowerCase() !== 'delete') {
      return;
    }
    
    await knowledgeService.deleteSection(ownerId, currentSection.id);
    // Navigate back to knowledge page
    window.location.hash = '/knowledge';
  };

  const handleBack = () => {
    window.location.hash = '/knowledge';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-600 dark:text-gray-400">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="font-medium">Back to Knowledge</span>
        </button>

        {/* Main Content */}
        <article className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 sm:p-8 lg:p-10 relative">
          {/* Edit Buttons - Only visible to officers/admins */}
          {canEdit && (
            <div className="absolute top-6 right-6 flex gap-2">
              {currentSection && (
                <button
                  onClick={() => setIsEditingSection(true)}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Edit section title and icon"
                >
                  <Settings size={20} />
                </button>
              )}
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Edit page content"
              >
                <Edit2 size={20} />
              </button>
            </div>
          )}

          {/* Page Header */}
          <div className="mb-6 pr-24">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              {currentSection?.title || pageTitle}
            </h1>
            {currentSection?.description && (
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {currentSection.description}
              </p>
            )}
          </div>

          {/* Render content as HTML */}
          <div
            className="prose prose-lg dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: content }}
          />

          {children}
        </article>

        {/* Content Editor Modal */}
        {canEdit && (
          <KnowledgeEditorModal
            isOpen={isEditing}
            onClose={() => setIsEditing(false)}
            onSave={handleSave}
            initialContent={content}
            pageTitle={currentSection?.title || pageTitle}
          />
        )}

        {/* Section Editor Modal */}
        {canEdit && currentSection && (
          <KnowledgeSectionEditor
            isOpen={isEditingSection}
            onClose={() => setIsEditingSection(false)}
            onSave={handleSaveSection}
            onDelete={handleDeleteSection}
            initialData={currentSection}
            isNewSection={false}
          />
        )}

        {/* Back to Top Button */}
        <div className="mt-8 text-center">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            <ArrowLeft size={20} />
            Back to Knowledge
          </button>
        </div>
      </div>
    </div>
  );
};
