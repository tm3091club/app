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
                    body {
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    .print-hide {
                        display: none !important;
                    }
                    @page {
                        margin: 0.75in;
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
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg print:shadow-none print:rounded-none">
                    {/* Header */}
                    <div className="p-6 print:p-8 text-center border-b dark:border-gray-700 print:border-b-2 print:border-gray-300">
                        <h1 className="text-2xl font-bold mb-2 print:text-3xl">
                            {rosterData.clubName}
                        </h1>
                        <p className="text-lg mb-2">Club #{rosterData.clubNumber}</p>
                        <h2 className="text-xl font-semibold mb-2 print:text-2xl">Meeting Roles</h2>
                        <p className="text-lg print:text-xl">
                            {format(meetingDate, 'MMMM d, yyyy')}
                        </p>
                        {rosterData.theme && (
                            <p className="text-lg mt-2 font-medium text-red-600 dark:text-red-400 print:text-xl print:text-red-600">
                                Theme: "{rosterData.theme}"
                            </p>
                        )}
                    </div>

                    {/* Roster Table */}
                    <div className="p-6 print:p-8">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b-2 border-gray-300 dark:border-gray-600 print:border-gray-400">
                                    <th className="text-left py-3 px-4 font-bold text-lg print:text-xl print:bg-blue-100">
                                        Role
                                    </th>
                                    <th className="text-left py-3 px-4 font-bold text-lg print:text-xl print:bg-blue-100">
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
                                            className="border-b border-gray-200 dark:border-gray-700 print:border-gray-300"
                                        >
                                            <td className="py-3 px-4 font-semibold text-gray-900 dark:text-gray-100 print:text-black print:text-base">
                                                {role}
                                            </td>
                                            <td className={`py-3 px-4 print:text-base ${
                                                isUnassigned 
                                                    ? 'text-red-600 dark:text-red-400 font-bold print:text-red-600 print:font-bold' 
                                                    : 'text-gray-800 dark:text-gray-200 print:text-black'
                                            }`}>
                                                {member || 'UNASSIGNED'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer */}
                    <div className="p-4 print:p-6 border-t dark:border-gray-700 text-center text-sm text-gray-500 dark:text-gray-400 print:border-t print:border-gray-300 print:text-gray-600">
                        <p>Generated by Toastmasters Monthly Scheduler v{APP_VERSION}</p>
                        <p className="mt-1">Visit <a href={window.location.origin} className="text-blue-600 dark:text-blue-400 hover:underline print:text-blue-600">tmapp.club</a> to create your own schedule</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
