import React, { useState } from 'react';
import { X, Save, Plus } from 'lucide-react';
import * as Icons from 'lucide-react';

interface KnowledgeSectionEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (section: { id: string; title: string; description: string; icon: string; isFeatured?: boolean }) => Promise<void>;
  onDelete?: () => Promise<void>;
  initialData?: {
    id: string;
    title: string;
    description: string;
    icon: string;
    isFeatured?: boolean;
  };
  isNewSection?: boolean;
}

// Popular icons that make sense for knowledge sections
const AVAILABLE_ICONS = [
  'BookOpen', 'Users', 'Shield', 'FileText', 'HelpCircle', 
  'Award', 'Calendar', 'CheckSquare', 'Clipboard', 'Coffee',
  'Edit', 'Eye', 'Flag', 'Grid', 'Heart', 'Home', 'Info',
  'Layers', 'List', 'Map', 'MessageSquare', 'Monitor', 'Package',
  'Settings', 'Star', 'Target', 'TrendingUp', 'Trophy', 'Zap'
];

export const KnowledgeSectionEditor: React.FC<KnowledgeSectionEditorProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialData,
  isNewSection = false,
}) => {
  const [id, setId] = useState(initialData?.id || '');
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [selectedIcon, setSelectedIcon] = useState(initialData?.icon || 'BookOpen');
  const [isFeatured, setIsFeatured] = useState(initialData?.isFeatured || false);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!title.trim() || (!id.trim() && isNewSection)) {
      alert('Please provide a title' + (isNewSection ? ' and ID' : ''));
      return;
    }

    setSaving(true);
    try {
      await onSave({
        id: isNewSection ? id.toLowerCase().replace(/\s+/g, '-') : initialData!.id,
        title,
        description,
        icon: selectedIcon,
        isFeatured,
      });
      onClose();
    } catch (error) {
      console.error('Error saving section:', error);
      alert('Failed to save section. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName];
    return IconComponent ? <IconComponent size={20} /> : null;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {isNewSection ? 'Add New Section' : 'Edit Section'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isNewSection && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Section ID (URL-friendly, lowercase)
              </label>
              <input
                type="text"
                value={id}
                onChange={(e) => setId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., leadership-guide"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="e.g., Leadership Guide"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              rows={3}
              placeholder="Brief description of this section..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Icon
            </label>
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
              {AVAILABLE_ICONS.map((iconName) => (
                <button
                  key={iconName}
                  onClick={() => setSelectedIcon(iconName)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedIcon === iconName
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-600 dark:text-gray-400'
                  }`}
                  title={iconName}
                >
                  {renderIcon(iconName)}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Selected: {selectedIcon}
            </p>
          </div>

          <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <input
              type="checkbox"
              id="featured"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <label htmlFor="featured" className="flex-1 cursor-pointer">
              <span className="text-sm font-medium text-gray-900 dark:text-white block">
                Featured Section
              </span>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Display this section with a blue border in the "Start Here" area
              </span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <div>
            {!isNewSection && onDelete && (
              <button
                onClick={onDelete}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-gray-400"
              >
                Delete Section
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
            >
              <Save size={16} />
              {saving ? 'Saving...' : isNewSection ? 'Add Section' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
