import React from 'react';
import { EditableKnowledgePage } from './common/EditableKnowledgePage';

const DEFAULT_CONTENT = `
<p style="color: rgb(55, 65, 81); line-height: 1.625;">
  Content coming soon. This section will cover how our meetings run, our values, and what "professional" looks like in practice.
</p>
`;

export const ClubOverviewPage: React.FC = () => {
  return (
    <EditableKnowledgePage
      pageId="club-overview"
      pageTitle="Club Overview"
      defaultContent={DEFAULT_CONTENT}
    />
  );
};
