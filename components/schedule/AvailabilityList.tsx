
import React from 'react';

export const AvailabilityList: React.FC<{
    title: string;
    members: string[];
    bgColor: string;
    textColor: string;
}> = ({ title, members, bgColor, textColor }) => (
    <div className="p-3 rounded-lg text-center" style={{ backgroundColor: bgColor }}>
        <h4 className={`text-sm font-bold mb-2 ${textColor}`}>{title}</h4>
        <ul className="text-xs space-y-1">
            {members.length > 0 ? (
                members.map((name, i) => <li key={i} className={textColor}>{name}</li>)
            ) : (
                <li className={`${textColor} opacity-70`}>None</li>
            )}
        </ul>
    </div>
);
