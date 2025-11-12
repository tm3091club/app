import React from 'react';
import { EditableKnowledgePage } from './common/EditableKnowledgePage';

const DEFAULT_CONTENT = `
<p style="color: rgb(55, 65, 81); line-height: 1.625;">
  Content coming soon. This section will cover officer duties, procedures, and how we keep meetings consistent and high-quality.
</p>
`;

export const OfficersHubPage: React.FC = () => {
  return (
    <EditableKnowledgePage
      pageId="officers-hub"
      pageTitle="Officers Hub"
      defaultContent={DEFAULT_CONTENT}
    />
  );
};
