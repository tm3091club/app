import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { WeeklyAgenda } from '../types';
import { format } from 'date-fns';
import { APP_VERSION } from '../utils/version';

interface PublicAgendaData extends WeeklyAgenda {
    clubName: string;
    clubNumber: string;
}

export const PublicAgendaPage: React.FC<{ clubNumber: string; shareId: string }> = ({ clubNumber, shareId }) => {
    const [agendaData, setAgendaData] = useState<PublicAgendaData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const docId = `${clubNumber}_${shareId}`;
        const publicDocRef = db.collection('publicAgendas').doc(docId);

        const unsubscribe = publicDocRef.onSnapshot((docSnap) => {
            setLoading(false);

            if (docSnap.exists) {
                const serverData = docSnap.data() as PublicAgendaData;
                setAgendaData(serverData);
                setError(null);
            } else {
                setError("This agenda is no longer available or the link is invalid.");
                setAgendaData(null);
            }
        }, (err) => {
            console.error("Error fetching public agenda:", err);
            setError("Could not load the agenda. Please check the link and your connection.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [clubNumber, shareId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="flex flex-col items-center">
                    <svg className="animate-spin h-8 w-8 text-indigo-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-xl text-gray-700 dark:text-gray-300">Loading Agenda...</p>
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

    if (!agendaData) {
        return null;
    }

    const meetingDate = new Date(agendaData.meetingDate);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 print:bg-white print:min-h-0">
            <style>{`
                @media print {
                    * {
                        line-height: 1.1 !important;
                    }
                    table {
                        font-size: 12pt !important;
                    }
                    th, td {
                        padding: 3pt !important;
                    }
                    body {
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    .agenda-container {
                        margin-bottom: 0 !important;
                        padding-bottom: 0 !important;
                        page-break-after: avoid !important;
                    }
                    @page {
                        margin: 0.5in;
                    }
                    div:last-child {
                        margin-bottom: 0 !important;
                        padding-bottom: 0 !important;
                    }
                }
            `}</style>
            <div className="max-w-6xl mx-auto p-4 print:p-0 print:mb-0">
                {/* Header */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg print:shadow-none print:rounded-none mb-6 print:mb-0 agenda-container">
                    <div className="p-6 print:pt-0 print:pb-0 print:px-0 text-center border-b dark:border-gray-700 print:border-0">
                        <h1 className="text-2xl font-bold mb-2 print:text-xs print:mb-0 print:font-bold print:leading-tight">
                            {agendaData.clubName} TM-{agendaData.clubNumber} Meeting Agenda for {format(meetingDate, 'MMMM d, yyyy')}
                        </h1>
                        {agendaData.theme && (
                            <p className="text-lg mt-2 font-medium text-red-600 dark:text-red-400 print:text-xs print:mt-0 print:font-bold print:text-red-600">
                                Theme: "{agendaData.theme}"
                            </p>
                        )}
                    </div>

                    {/* Agenda Table */}
                    <div className="p-2 md:p-4 print:p-0 print:mt-0">
                        <table className="w-full border-collapse text-xs md:text-base print:text-xs print:border-gray-400 print:leading-tight">
                            <thead>
                                <tr className="border-b-2 border-gray-300 dark:border-gray-600 print:bg-blue-500 print:text-white">
                                    <th className="text-left py-0.5 px-1 md:py-1 md:px-2 w-16 print:text-center print:font-bold print:text-xs print:py-0.5 print:px-0.5 print:border print:border-gray-400" style={{width: '18mm'}}>Time</th>
                                    <th className="text-left py-0.5 px-1 md:py-1 md:px-2 w-1/3 print:text-left print:font-bold print:text-xs print:py-0.5 print:px-0.5 print:border print:border-gray-400" style={{width: '65mm'}}>Program Event</th>
                                    <th className="text-center py-0.5 px-1 md:py-1 md:px-2 hidden md:table-cell print:table-cell print:text-center print:font-bold print:text-xs print:py-0.5 print:px-0.5 print:border print:border-gray-400" style={{width: '35mm'}}>Member</th>
                                    <th className="text-center py-0.5 px-1 md:py-1 md:px-2 hidden md:table-cell print:table-cell print:text-center print:font-bold print:text-xs print:py-0.5 print:px-0.5 print:border print:border-gray-400" style={{width: '70mm'}}>Description of Role or Task</th>
                                    <th className="text-center py-0.5 px-1 md:py-1 md:px-2 md:hidden print:hidden">Member / Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                {agendaData.items.map((item) => {
                                    // Determine row color classes
                                    let rowColorClass = '';
                                    let isSpaceRow = false;
                                    
                                    if (item.rowColor === 'highlight') {
                                        rowColorClass = 'bg-blue-50 dark:bg-blue-900/20 print:bg-blue-100';
                                    } else if (item.rowColor === 'space') {
                                        rowColorClass = 'bg-red-50 dark:bg-red-900/20 print:bg-red-100';
                                        isSpaceRow = true;
                                    }
                                    
                                    return (
                                        <tr key={item.id} className={`border-b border-gray-200 dark:border-gray-700 print:border-gray-400 ${rowColorClass}`}>
                                            <td className="py-0.5 px-1 md:py-1 md:px-2 align-top print:text-center print:py-0.5 print:px-0.5 print:border print:border-gray-400 print:text-xs print:align-top" style={{ verticalAlign: 'top' }}>
                                                {item.time}
                                            </td>
                                            {isSpaceRow ? (
                                                // Space row: content in Program Event column
                                                <>
                                                    <td className="py-0.5 px-1 md:py-1 md:px-2 text-left print:text-left print:py-0.5 print:px-0.5 print:border print:border-gray-400 print:text-xs print:align-top print:font-bold print:text-red-600" style={{ verticalAlign: 'top' }}>
                                                        <span className="font-medium text-red-600 dark:text-red-400 block break-words print:text-red-600 print:font-bold">
                                                            {item.programEvent || item.person || item.description}
                                                        </span>
                                                    </td>
                                                    {/* Empty cells for Member and Description columns */}
                                                    <td className="py-0.5 px-1 md:py-1 md:px-2 hidden md:table-cell print:table-cell print:py-0.5 print:px-0.5 print:border print:border-gray-400 print:text-xs print:align-top" style={{ verticalAlign: 'top' }}></td>
                                                    <td className="py-0.5 px-1 md:py-1 md:px-2 hidden md:table-cell print:table-cell print:py-0.5 print:px-0.5 print:border print:border-gray-400 print:text-xs print:align-top" style={{ verticalAlign: 'top' }}></td>
                                                </>
                                            ) : (
                                                // Normal row: separate columns
                                                <>
                                                    <td className="py-0.5 px-1 md:py-1 md:px-2 align-top print:text-left print:py-0.5 print:px-0.5 print:border print:border-gray-400 print:text-xs print:align-top print:font-bold" style={{ verticalAlign: 'top' }}>
                                                        <span className="font-medium print:font-bold">{item.programEvent}</span>
                                                    </td>
                                                    {/* Desktop: separate columns */}
                                                    <td className="py-0.5 px-1 md:py-1 md:px-2 text-center hidden md:table-cell print:table-cell print:text-center print:py-0.5 print:px-0.5 print:border print:border-gray-400 print:text-xs print:align-top" style={{ verticalAlign: 'top' }}>
                                                        {item.person}
                                                    </td>
                                                    <td className="py-0.5 px-1 md:py-1 md:px-2 hidden md:table-cell text-center print:table-cell print:text-center print:py-0.5 print:px-0.5 print:border print:border-gray-400 print:text-xs print:align-top" style={{ verticalAlign: 'top' }}>
                                                        {item.description}
                                                    </td>
                                                </>
                                            )}
                                            {/* Mobile: combined column */}
                                            <td className="py-0.5 px-1 md:py-1 md:px-2 text-center md:hidden print:hidden">
                                                {isSpaceRow ? (
                                                    // Space row mobile: empty since content shows in Program Event column
                                                    null
                                                ) : (
                                                    // Normal row mobile
                                                    <div className="text-center">
                                                        {item.person && <div className="font-medium">{item.person}</div>}
                                                        {item.description && <div className="text-xs text-gray-600 dark:text-gray-400">{item.description}</div>}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer */}
                    <div className="p-4 print:pt-0.5 print:pb-0 print:px-0 border-t dark:border-gray-700 print:border-t print:border-gray-400 print:mt-0.5">
                        {agendaData.nextMeetingInfo && (
                            <p className="mb-1 text-sm print:text-xs print:mb-0.5 print:leading-tight">
                                <strong className="print:font-bold">Next Meeting:</strong> TM: {agendaData.nextMeetingInfo.toastmaster}, 
                                Speakers: {agendaData.nextMeetingInfo.speakers.filter(s => s).join(', ')}, 
                                TT: {agendaData.nextMeetingInfo.tableTopicsMaster}
                            </p>
                        )}
                        <div className="text-sm text-gray-600 dark:text-gray-400 print:text-xs print:text-black print:leading-tight print:mb-0">
                            Website: <span className="ml-1">{agendaData.websiteUrl || `${window.location.origin} tmapp.club`}</span>
                        </div>
                    </div>
                </div>

                {/* Public View Footer */}
                <div className="text-center py-4 print:hidden">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        This is a public view of the meeting agenda for {agendaData.clubName}
                    </p>
                    <button 
                        onClick={() => window.print()}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition mr-2"
                    >
                        Print Agenda
                    </button>
                    <button 
                        onClick={() => window.location.href = window.location.origin}
                        className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition"
                    >
                        Visit Main App
                    </button>
                </div>
                
                {/* Version Footer */}
                <footer className="text-center py-2 px-4 print:hidden">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        Version: {APP_VERSION}
                    </span>
                </footer>
            </div>
        </div>
    );
};
