import React from 'react';
import { EditableKnowledgePage } from './common/EditableKnowledgePage';

const DEFAULT_CONTENT = `
<p style="color: rgb(55, 65, 81); line-height: 1.625;">
  Content coming soon. This section will cover staying sharp: speaking cadence, role rotations, and continuous growth.
</p>
`;

export const CurrentMembersPage: React.FC = () => {
  return (
    <EditableKnowledgePage
      pageId="current-members"
      pageTitle="Current Members"
      defaultContent={DEFAULT_CONTENT}
    />
  );
};
