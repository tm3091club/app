// Script to fix September 2025 schedule dates to be Wednesdays while preserving assignments
// This updates existing schedule dates to match the organization's meetingDay setting

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, updateDoc } = require('firebase/firestore');

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBcRGbOlfi0lVuoGKaWzX4DVXgh42zDjxA",
  authDomain: "toastmasters-scheduler-a4063.firebaseapp.com",
  projectId: "toastmasters-scheduler-a4063",
  storageBucket: "toastmasters-scheduler-a4063.appspot.com",
  messagingSenderId: "254757692024",
  appId: "1:254757692024:web:543e8e0c2a7fb36e7bca9a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Your user ID (club owner)
const USER_ID = 'o4QyZGSS88gc3p9qaLdqelFrg4B2';

function getMeetingDatesForMonth(year, month, meetingDay) {
  const dates = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  // Find the first meeting day of the month
  let currentDate = new Date(firstDay);
  while (currentDate.getDay() !== meetingDay) {
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Add all meeting days for the month
  while (currentDate <= lastDay) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 7); // Next week
  }
  
  return dates;
}

async function fixScheduleDates() {
  try {
    console.log('🔧 Starting schedule date fix...');
    
    const userDocRef = doc(db, 'users', USER_ID);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }
    
    const userData = userDoc.data();
    const organization = userData.organization;
    const schedules = userData.schedules || [];
    
    console.log(`📅 Organization meeting day: ${organization.meetingDay} (0=Sun, 1=Mon, 2=Tue, 3=Wed, etc.)`);
    
    // Find September 2025 schedule
    const septSchedule = schedules.find(s => s.id === '2025-09');
    if (!septSchedule) {
      console.log('❌ September 2025 schedule not found');
      return;
    }
    
    console.log(`📋 Found September schedule with ${septSchedule.meetings.length} meetings`);
    console.log('Current meeting dates:');
    septSchedule.meetings.forEach((meeting, i) => {
      const date = new Date(meeting.date);
      console.log(`  Week ${i + 1}: ${date.toDateString()} (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][date.getDay()]})`);
    });
    
    // Calculate correct meeting dates for September 2025 using the organization's meeting day
    const correctDates = getMeetingDatesForMonth(2025, 8, organization.meetingDay); // September is month 8
    
    console.log('\nCorrect meeting dates should be:');
    correctDates.forEach((date, i) => {
      console.log(`  Week ${i + 1}: ${date.toDateString()} (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][date.getDay()]})`);
    });
    
    // Update the meeting dates while preserving all assignments and themes
    const updatedMeetings = septSchedule.meetings.map((meeting, index) => {
      if (index < correctDates.length) {
        return {
          ...meeting,
          date: correctDates[index].toISOString()
        };
      }
      return meeting;
    });
    
    // Update the schedule in the schedules array
    const updatedSchedules = schedules.map(schedule => 
      schedule.id === '2025-09' 
        ? { ...schedule, meetings: updatedMeetings }
        : schedule
    );
    
    // Save back to Firestore
    await updateDoc(userDocRef, {
      schedules: updatedSchedules
    });
    
    console.log('\n✅ Schedule dates updated successfully!');
    console.log('All member assignments and themes have been preserved.');
    
  } catch (error) {
    console.error('❌ Error fixing schedule dates:', error);
  }
}

fixScheduleDates();
