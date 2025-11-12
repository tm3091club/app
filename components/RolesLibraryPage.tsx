import React from 'react';
import { EditableKnowledgePage } from './common/EditableKnowledgePage';

const DEFAULT_CONTENT = `
<p style="color: rgb(55, 65, 81); line-height: 1.625;">
  Content coming soon. This section will provide clear, actionable guides for every role—from Timer to General Evaluator.
</p>
`;

export const RolesLibraryPage: React.FC = () => {
  return (
    <EditableKnowledgePage
      pageId="roles-library"
      pageTitle="Roles Library"
      defaultContent={DEFAULT_CONTENT}
    />
  );
};
