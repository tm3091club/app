
import React from 'react';

export const WithTooltip: React.FC<{
  children: React.ReactNode;
  show: boolean;
  text?: string;
}> = ({ children, show, text = "Click the 🔒 to Edit" }) => {
  if (!show) {
    return <>{children}</>;
  }

  return (
    <div className="relative group">
      {children}
      <div 
        role="tooltip"
        className="absolute bottom-full left-0 mb-2 w-max max-w-xs px-3 py-1.5 bg-gray-800 text-white text-xs font-semibold rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 dark:bg-gray-100 dark:text-gray-900"
      >
        {text}
        <div className="absolute left-3 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800 dark:border-t-gray-100"></div>
      </div>
    </div>
  );
};
