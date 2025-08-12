import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/firebase';
import { MonthlySchedule, Member } from '../types';
import { TOASTMASTERS_ROLES } from '../Constants';

interface PublicScheduleData extends MonthlySchedule {
    publicMembers: Pick<Member, 'id' | 'name'>[];
    clubName: string;
}

const ReadOnlyCell: React.FC<{ name: string | null }> = ({ name }) => (
    <div className="w-full text-center py-1.5 px-2 text-sm text-gray-800 dark:text-gray-100 h-[35px] flex items-center justify-center truncate">
        {name || <span className="italic text-gray-500 dark:text-gray-400">-- Unassigned --</span>}
    </div>
);

export const PublicSchedulePage: React.FC<{ clubNumber: string; shareId: string }> = ({ clubNumber, shareId }) => {
    const [scheduleData, setScheduleData] = useState<PublicScheduleData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const docId = `${clubNumber}_${shareId}`;
        const publicDocRef = db.collection('publicSchedules').doc(docId);

        const unsubscribe = publicDocRef.onSnapshot((docSnap) => {
            setLoading(false);

            if (docSnap.exists) {
                const serverData = docSnap.data() as PublicScheduleData;
                setScheduleData(serverData);
                setError(null);
            } else {
                setError("This schedule is no longer available or the link is invalid.");
                setScheduleData(null);
            }
        }, (err) => {
            console.error("Error fetching public schedule:", err);
            setError("Could not load the schedule. Please check the link and your connection.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [clubNumber, shareId]);

    const getMemberName = useMemo(() => {
        if (!scheduleData?.publicMembers) return () => '';
        const memberMap = new Map(scheduleData.publicMembers.map(m => [m.id, m.name]));
        return (memberId: string | null) => {
            if (!memberId) return null;
            return memberMap.get(memberId) || '[Deleted Member]';
        }
    }, [scheduleData?.publicMembers]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <svg className="animate-spin h-8 w-8 text-indigo-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-xl text-gray-700 dark:text-gray-300">Loading Schedule...</p>
                </div>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
                 <div className="text-center bg-red-100 dark:bg-red-900/30 p-8 rounded-lg shadow-lg">
                    <h2 className="text-2xl font-bold text-red-800 dark:text-red-300">Oops! An Error Occurred</h2>
                    <p className="text-red-600 dark:text-red-400 mt-2">{error}</p>
                </div>
            </div>
        )
    }

    if (!scheduleData) {
        return null;
    }

    const clubDisplayName = scheduleData.clubName ? `${scheduleData.clubName} ` : '';

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans p-4 sm:p-6 lg:p-8">
            <header className="max-w-screen-2xl mx-auto mb-6 text-center">
                <img className="mx-auto h-12 w-auto mb-4" src="https://www.toastmasters.org/content/images/globals/toastmasters-logo@2x.png" alt="Toastmasters International Logo" />
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
                    {clubDisplayName}{new Date(scheduleData.year, scheduleData.month).toLocaleString('default', { month: 'long', year: 'numeric' })} Schedule
                </h1>
                <p className="mt-2 text-md text-gray-600 dark:text-gray-400">
                    This is a view-only schedule. Changes are updated in real-time for everyone.
                </p>
            </header>
            <main className="max-w-screen-2xl mx-auto">
                 <div className="overflow-x-auto bg-white dark:bg-gray-800 shadow-lg rounded-lg">
                    <table className="min-w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th scope="col" className="sticky left-0 bg-gray-50 dark:bg-gray-700/50 p-4 text-left text-sm font-semibold text-gray-900 dark:text-white w-48">Role</th>
                                {scheduleData.meetings.map((meeting, index) => (
                                    <th key={index} scope="col" className="p-4 text-center text-sm font-semibold text-gray-900 dark:text-white min-w-[200px]">
                                        {new Date(meeting.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })}
                                    </th>
                                ))}
                            </tr>
                            <tr>
                                <th scope="col" className="sticky left-0 bg-gray-100 dark:bg-gray-700 p-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Theme</th>
                                {scheduleData.meetings.map((meeting, index) => (
                                    <td key={index} className="p-2 align-top bg-gray-100 dark:bg-gray-700">
                                        <div className="w-full bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-500 rounded-md py-1.5 px-2 text-sm text-center h-[35px] flex items-center justify-center">
                                            {meeting.isBlackout ? <span className="italic opacity-70">BLACKOUT</span> : meeting.theme || <span className="italic opacity-70">No theme set</span>}
                                        </div>
                                    </td>
                                ))}
                            </tr>
                        </thead>
                         <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {TOASTMASTERS_ROLES.map(role => (
                                <tr key={role} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                    <td className="sticky left-0 bg-white dark:bg-gray-800 p-4 text-sm font-medium text-gray-900 dark:text-gray-200 whitespace-nowrap">{role}</td>
                                    {scheduleData.meetings.map((meeting, index) => (
                                        <td key={index} className={`p-2 align-top ${meeting.isBlackout ? 'bg-gray-100 dark:bg-gray-900/50' : ''}`}>
                                            {meeting.isBlackout ? (
                                                <div className="w-full text-center py-1.5 px-2 text-sm text-gray-500 dark:text-gray-400 font-semibold italic h-[35px] flex items-center justify-center">
                                                    BLACKOUT
                                                </div>
                                            ) : (
                                                <ReadOnlyCell name={getMemberName(meeting.assignments[role])} />
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>
             <footer className="text-center mt-8 text-sm text-gray-500 dark:text-gray-400">
                <p>Toastmasters Monthly Scheduler</p>
            </footer>
        </div>
    );
};