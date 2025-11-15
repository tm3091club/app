import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { format } from 'date-fns';
import { APP_VERSION } from '../utils/version';

interface PublicRosterData {
    clubName: string;
    clubNumber: string;
    meetingDate: string;
    theme: string;
    roster: { [role: string]: string | null };
    shareId: string;
}

export const PublicRosterPage: React.FC<{ clubNumber: string; shareId: string }> = ({ clubNumber, shareId }) => {
    const [rosterData, setRosterData] = useState<PublicRosterData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const docId = `${clubNumber}_${shareId}`;
        const publicDocRef = db.collection('publicRosters').doc(docId);

        const unsubscribe = publicDocRef.onSnapshot((docSnap) => {
            setLoading(false);

            if (docSnap.exists) {
                const serverData = docSnap.data() as PublicRosterData;
                setRosterData(serverData);
                setError(null);
            } else {
                setError("This roster is no longer available or the link is invalid.");
                setRosterData(null);
            }
        }, (err) => {
            console.error("Error fetching public roster:", err);
            setError("Could not load the roster. Please check the link and your connection.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [clubNumber, shareId]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="flex flex-col items-center">
                    <svg className="animate-spin h-8 w-8 text-indigo-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-xl text-gray-700 dark:text-gray-300">Loading Roster...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md">
                    <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
                        Oops! An Error Occurred
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        {error}
                    </p>
                    <button 
                        onClick={() => window.location.href = window.location.origin}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition"
                    >
                        Go to Main App
                    </button>
                </div>
            </div>
        );
    }

    if (!rosterData) {
        return null;
    }

    // Parse the date correctly to avoid timezone issues
    let meetingDate;
    if (rosterData.meetingDate) {
        const dateStr = rosterData.meetingDate;
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month, day] = dateStr.split('-').map(Number);
            meetingDate = new Date(year, month - 1, day);
        } else {
            meetingDate = new Date(rosterData.meetingDate);
        }
    } else {
        meetingDate = new Date();
    }

    const TOASTMASTERS_ROLES = [
        'President', 'Pledge', 'Thought of the Day', 'Toastmaster', 'Grammarian',
        'Timekeeper', 'Ballot Counter', 'Ah-Counter', 'Table Topics Master',
        'Speaker 1', 'Speaker 2', 'Speaker 3', 'General Evaluator',
        'Evaluator 1', 'Evaluator 2', 'Evaluator 3', 'Inspiration Award'
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 print:bg-white print:min-h-0">
            <style>{`
                @media print {
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }
                    body {
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    .print-hide {
                        display: none !important;
                    }
                    @page {
                        margin: 0.5in;
                        size: letter portrait;
                    }
                    .roster-container {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                        page-break-before: avoid !important;
                        page-break-after: avoid !important;
                    }
                    .roster-header {
                        page-break-inside: avoid !important;
                        page-break-after: avoid !important;
                    }
                    table {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                        page-break-before: avoid !important;
                        table-layout: fixed !important;
                        width: 100% !important;
                    }
                    tr {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                    thead {
                        display: table-header-group !important;
                    }
                    tbody {
                        page-break-inside: avoid !important;
                    }
                    .role-column {
                        width: 40% !important;
                        min-width: 40% !important;
                    }
                    .member-column {
                        width: 60% !important;
                        min-width: 60% !important;
                    }
                }
            `}</style>
            
            <div className="max-w-4xl mx-auto p-4 print:p-0">
                {/* Action Buttons - Hide in print */}
                <div className="mb-6 print-hide flex gap-3">
                    <button
                        onClick={handlePrint}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition"
                    >
                        Print Roster
                    </button>
                    <button
                        onClick={() => window.location.href = window.location.origin}
                        className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md transition"
                    >
                        Visit Main App
                    </button>
                </div>

                {/* Roster Content */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg print:shadow-none print:rounded-none roster-container">
                    {/* Header - Compact for print */}
                    <div className="p-6 print:p-2 text-center border-b dark:border-gray-700 print:border-0 roster-header">
                        <h1 className="text-2xl font-bold mb-1 print:text-lg print:mb-1 print:leading-tight">
                            {rosterData.clubName} {rosterData.clubNumber} - Meeting Roles
                        </h1>
                        <p className="text-lg print:text-base print:mb-1">
                            {format(meetingDate, 'MMMM d, yyyy')}
                        </p>
                        {rosterData.theme && (
                            <p className="text-lg mt-2 font-medium text-red-600 dark:text-red-400 print:text-base print:text-red-600 print:mt-1 print:mb-2">
                                Theme: "{rosterData.theme}"
                            </p>
                        )}
                    </div>

                    {/* Roster Table - Compact */}
                    <div className="p-6 print:p-3">
                        <table className="w-full border-collapse border border-gray-400 print:border-gray-400">
                            <thead>
                                <tr className="bg-blue-500 text-white print:bg-blue-500 print:text-white">
                                    <th className="role-column text-left py-3 px-4 font-bold text-base border border-gray-400 print:text-base print:py-2 print:px-3 print:border-gray-400">
                                        Role
                                    </th>
                                    <th className="member-column text-left py-3 px-4 font-bold text-base border border-gray-400 print:text-base print:py-2 print:px-3 print:border-gray-400">
                                        Member
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {TOASTMASTERS_ROLES.map((role) => {
                                    const member = rosterData.roster[role];
                                    const isUnassigned = !member;
                                    
                                    return (
                                        <tr 
                                            key={role} 
                                            className="border border-gray-400 print:border-gray-400"
                                        >
                                            <td className="role-column py-2 px-4 font-normal text-gray-900 dark:text-gray-100 border border-gray-400 print:text-gray-700 print:text-sm print:py-1.5 print:px-3 print:border-gray-400">
                                                {role}
                                            </td>
                                            <td className={`member-column py-2 px-4 border border-gray-400 print:text-sm print:py-1.5 print:px-3 print:border-gray-400 ${
                                                isUnassigned 
                                                    ? 'text-red-600 dark:text-red-400 font-bold print:text-red-600 print:font-bold' 
                                                    : 'text-gray-800 dark:text-gray-200 print:text-gray-600'
                                            }`}>
                                                {member || 'UNASSIGNED'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer - Hidden in print */}
                    <div className="p-4 print:hidden border-t dark:border-gray-700 text-center text-sm text-gray-500 dark:text-gray-400">
                        <p>Generated by Toastmasters Monthly Scheduler v{APP_VERSION}</p>
                        <p className="mt-1">Visit <a href={window.location.origin} className="text-blue-600 dark:text-blue-400 hover:underline">tmapp.club</a> to create your own schedule</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
