import React from 'react';
import { EditableKnowledgePage } from './common/EditableKnowledgePage';

const DEFAULT_CONTENT = `
<p style="color: rgb(55, 65, 81); line-height: 1.625;">
  Content coming soon. This section will include extra references, tips, and helpful tools.
</p>
`;

export const MiscPage: React.FC = () => {
  return (
    <EditableKnowledgePage
      pageId="misc"
      pageTitle="Miscellaneous"
      defaultContent={DEFAULT_CONTENT}
    />
  );
};
