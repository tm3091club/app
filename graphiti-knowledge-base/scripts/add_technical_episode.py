#!/usr/bin/env python3
"""
Add Detailed Technical Implementation Episode to Graphiti Knowledge Base
This script adds the detailed technical implementation episode to the Graphiti knowledge base.
"""

import asyncio
import os
import sys
from datetime import datetime

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import configuration
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'config'))
from config import setup_environment

try:
    from graphiti_core import Graphiti
    from graphiti_core.driver.falkordb_driver import FalkorDriver
    GRAPHITI_AVAILABLE = True
except ImportError:
    print("ERROR: Graphiti not installed. Please run: pip install graphiti-core[falkordb]")
    GRAPHITI_AVAILABLE = False
    sys.exit(1)

async def add_technical_episode():
    """Add the detailed technical implementation episode to Graphiti"""
    
    try:
        # Set up environment
        setup_environment()
        
        # Initialize Graphiti with FalkorDB
        driver = FalkorDriver(
            host=os.getenv("FALKORDB_HOST", "localhost"),
            port=int(os.getenv("FALKORDB_PORT", "6379"))
        )
        graphiti = Graphiti(graph_driver=driver)
        
        print("Connected to Graphiti knowledge base")
        
        # Add detailed technical implementation episode
        technical_content = """
        Detailed Technical Implementation Guide:
        
        CORE APPLICATION ARCHITECTURE:
        
        React + TypeScript + Vite Stack:
        - React 19.1.0 with TypeScript 5.8.2 for type safety
        - Vite 6.2.0 for fast development and optimized builds
        - Tailwind CSS 4.1.11 for utility-first styling
        - Firebase 12.0.0 for backend services (Firestore, Auth, Functions)
        - Lucide React for consistent iconography
        
        Key Functions and Their Purpose:
        
        1. getAppropriateScheduleId(): Determines which monthly schedule to display by default
           - Logic: Check if current month has future meetings
           - Fallback: Switch to next month if no future meetings
           - Timezone handling: Uses 'T00:00:00' suffix for proper date comparison
           - Edge cases: Year transitions (December to January)
           - Implementation: Uses useCallback for performance optimization
           - Error handling: Graceful fallback to current month on errors
        
        2. getDefaultWeek(): Automatically selects the appropriate week to show in weekly agenda
           - Calculates current week number within the month
           - Handles month boundaries and leap years
           - Returns week index for agenda display
           - Uses moment.js for date calculations
           - Caches results to prevent recalculation
        
        3. loadOrCreateAgenda(): Creates or loads agenda for a specific week
           - Checks for existing agenda in Firestore
           - Creates new agenda with default template if none exists
           - Applies role-bound items based on member assignments
           - Returns agenda object with all necessary data
           - Handles concurrent editing conflicts
           - Uses optimistic updates for better UX
        
        4. saveWeeklyAgenda(): Persists agenda changes to Firebase
           - Validates agenda data before saving
           - Updates Firestore with optimistic updates
           - Handles concurrent editing conflicts
           - Triggers notifications for role changes
           - Uses batch writes for atomic operations
           - Implements retry logic for network failures
        
        5. handleShare(): Creates public shareable links for agendas
           - Generates unique share IDs using crypto.randomUUID()
           - Creates public document in Firestore
           - Sets appropriate expiration dates (30 days default)
           - Returns shareable URL for external access
           - Implements access tracking and analytics
           - Handles URL generation and validation
        
        Data Models and TypeScript Interfaces:
        
        MonthlySchedule Interface:
        - id: string (unique schedule identifier)
        - month: number (1-12)
        - year: number (full year)
        - meetings: Meeting[] (array of weekly meetings)
        - createdAt: Timestamp
        - updatedAt: Timestamp
        - theme: string (monthly theme)
        - notes: string (schedule notes)
        
        Meeting Interface:
        - date: string (ISO date string)
        - theme: string (meeting theme)
        - roles: Record<string, string> (role assignments)
        - notes: string (additional meeting notes)
        - isCancelled: boolean (cancellation status)
        - specialInstructions: string (special meeting instructions)
        
        WeeklyAgenda Interface:
        - id: string (unique agenda identifier)
        - scheduleId: string (reference to monthly schedule)
        - week: number (week number in month)
        - items: AgendaItem[] (agenda items array)
        - theme: string (meeting theme)
        - createdAt: Timestamp
        - updatedAt: Timestamp
        - isPublished: boolean (publication status)
        - shareId?: string (public share identifier)
        
        AgendaItem Interface:
        - id: string (unique item identifier)
        - type: 'role' | 'announcement' | 'custom'
        - title: string (item title)
        - description: string (item description)
        - role: string (associated role, if applicable)
        - order: number (display order)
        - isRoleBound: boolean (auto-updates with role assignments)
        - duration: number (estimated duration in minutes)
        - isRequired: boolean (required vs optional item)
        
        Member Interface:
        - id: string (unique member identifier)
        - uid: string (Firebase Auth UID)
        - name: string (display name)
        - email: string (email address)
        - role: UserRole (Admin | Member)
        - status: 'active' | 'inactive' | 'guest'
        - qualifications: string[] (role qualifications)
        - availability: Record<string, boolean> (weekly availability)
        - preferences: MemberPreferences (role preferences)
        - officerRole?: OfficerRole (optional officer position)
        - joinedDate: Timestamp (member join date)
        - lastActive: Timestamp (last activity timestamp)
        
        Organization Interface:
        - name: string (club name)
        - district: string (Toastmasters district)
        - clubNumber: string (official club number)
        - meetingDay: number (day of week, 0-6)
        - meetingTime: string (meeting time)
        - timezone: string (club timezone)
        - members: Member[] (club members array)
        - settings: OrganizationSettings (club-specific settings)
        - autoNotificationDay: number (day of month for notifications)
        - isActive: boolean (club active status)
        
        Firebase Collections Structure:
        
        users/{uid}:
        - organization: Organization (club data)
        - schedules: Record<string, MonthlySchedule> (monthly schedules)
        - preferences: UserPreferences (user settings)
        - lastLogin: Timestamp
        - createdAt: Timestamp
        - notifications: Notification[] (user notifications)
        - settings: UserSettings (user-specific settings)
        
        publicAgendas/{shareId}:
        - agenda: WeeklyAgenda (shared agenda data)
        - schedule: MonthlySchedule (associated schedule)
        - expiresAt: Timestamp (expiration date)
        - accessCount: number (view count)
        - createdAt: Timestamp
        - isActive: boolean (share active status)
        - accessLog: AccessLog[] (access tracking)
        
        publicSchedules/{shareId}:
        - schedule: MonthlySchedule (shared schedule data)
        - expiresAt: Timestamp (expiration date)
        - accessCount: number (view count)
        - createdAt: Timestamp
        - isActive: boolean (share active status)
        - accessLog: AccessLog[] (access tracking)
        
        organizations/{orgId}/mentorshipPairs/{pairId}:
        - id: string (mentorId_menteeId format)
        - mentorId: string (Member.id reference)
        - menteeId: string (Member.id reference)
        - createdAt: serverTimestamp
        - active: boolean
        - notes: subcollection (mentorship notes)
        - lastInteraction: Timestamp (last note or interaction)
        - goals: string[] (shared goals)
        
        MENTORSHIP SYSTEM TECHNICAL DETAILS:
        
        Service Layer Architecture (mentorshipService.ts):
        
        pairId(mentorId: string, menteeId: string): string
        - Generates unique pair identifiers using underscore separator
        - Format: ${mentorId}_${menteeId}
        - Ensures consistent ID generation across the app
        - Validates input parameters
        - Returns standardized pair identifier
        
        async upsertPair(orgId: string, mentorId: string, menteeId: string): Promise<string>
        - Creates or updates mentorship pairs with server timestamps
        - Uses Firestore merge operations for atomic updates
        - Returns the generated pair ID
        - Error handling for duplicate pairs
        - Validates organization and member existence
        - Implements transaction safety
        
        async getAllPairs(orgId: string): Promise<MentorshipPair[]>
        - Fetches all mentorship pairs for an organization
        - Returns array of MentorshipPair objects
        - Includes error handling for network issues
        - Implements pagination for large datasets
        - Caches results for performance
        
        notesRef(orgId: string, pairId: string): CollectionReference
        - Returns Firestore reference to notes subcollection
        - Enables direct access to notes collection
        - Used by other service methods
        - Validates organization and pair existence
        - Returns typed collection reference
        
        async addNote(orgId: string, pairId: string, note: Omit<MentorshipNote, 'id' | 'createdAt'>): Promise<void>
        - Creates new notes with proper typing and validation
        - Auto-generates note ID using Firestore doc() method
        - Sets serverTimestamp for createdAt field
        - Validates note data before saving
        - Implements optimistic updates
        - Handles concurrent note creation
        
        watchNotes(orgId: string, pairId: string, onSnapshot: (arr: MentorshipNote[]) => void): Unsubscribe
        - Real-time listener for note updates using onSnapshot
        - Orders notes by createdAt in descending order
        - Returns unsubscribe function for cleanup
        - Handles connection errors gracefully
        - Implements retry logic for network failures
        - Provides offline support with cached data
        
        React Component Architecture:
        
        MentorshipManager Component:
        - Admin-only pair management with CRUD operations
        - State: pairs, loading, error, selectedPair, searchTerm
        - Functions: loadPairs, createPair, togglePair, deletePair, searchPairs
        - UI: Table view with member names, status toggles, statistics
        - Props: organization, currentUser, isAdmin
        - Performance: useCallback for event handlers, useMemo for filtered data
        - Error handling: Try-catch blocks, user-friendly error messages
        - Accessibility: ARIA labels, keyboard navigation
        
        MentorshipNotes Component:
        - Modal/drawer with real-time note display and creation
        - State: notes, loading, error, isOpen, newNote, filterType
        - Functions: loadNotes, addNote, updateNote, deleteNote, filterNotes
        - UI: Note list, creation form, filtering, search, pagination
        - Props: pairId, mentorId, menteeId, isOpen, onClose
        - Performance: Virtual scrolling for large note lists
        - Real-time: Firestore listeners with proper cleanup
        - Validation: Form validation with real-time feedback
        
        MentorshipPanel Component:
        - Member profile integration with quick access
        - State: pairs, loading, error, showNotes, selectedPair
        - Functions: loadPairs, openNotes, closeNotes, selectPair
        - UI: Relationship display, quick actions, note access
        - Props: memberId, memberName, currentUser
        - Performance: Lazy loading for note modals
        - Responsive: Mobile-first design with breakpoints
        
        RoleAssignmentCell Integration:
        - Schedule integration with mentorship icons
        - State: mentorshipPairs, isAdmin, hoveredMember
        - Functions: canSeeMentorshipInfo, isMentee, handleHover
        - UI: Mentorship icon (📝) next to mentee names
        - Props: assignedMemberId, currentUser, organization
        - Performance: Memoized calculations for visibility
        - Accessibility: Tooltips and screen reader support
        
        State Management Patterns:
        
        Local Component State (useState):
        - Forms: input values, validation states, error messages
        - Modals: open/closed states, loading indicators, selected items
        - UI: expanded/collapsed states, hover states, focus states
        - Data: fetched data, error states, loading states, pagination
        - Filters: search terms, sort options, view preferences
        
        Performance Optimization (useCallback):
        - Event handlers to prevent re-renders
        - Expensive calculations with dependencies
        - API calls with parameter dependencies
        - Form submission handlers
        - Navigation and routing handlers
        - Debounced search functions
        
        Side Effects (useEffect):
        - Firestore listeners with proper cleanup
        - Data fetching on component mount
        - Dependency-based re-fetching
        - Cleanup functions for subscriptions
        - Window event listeners
        - Timer and interval management
        
        Global State (ToastmastersContext):
        - Organization data with real-time updates
        - Current user information and permissions
        - Schedule data with caching
        - Member data with relationships
        - Notification state management
        - Theme and preference settings
        
        Permission System Integration:
        
        isAdmin() Function:
        - Checks user role in organization
        - Returns boolean for admin status
        - Used for conditional rendering
        - Validates admin operations
        - Implements role hierarchy
        - Caches admin status for performance
        
        isAuthenticated() Function:
        - Checks Firebase Auth status
        - Returns boolean for auth state
        - Used for route protection
        - Validates user sessions
        - Handles token refresh
        - Implements session persistence
        
        Role-based Visibility:
        - Notes filtered by user relationships
        - Mentor can see mentee notes
        - Mentee can see shared notes
        - Officers can see officer-level notes
        - Admins can see all notes
        - Implements granular permissions
        - Caches permission calculations
        
        Firestore Security Rules:
        - Data access control at database level
        - User authentication validation
        - Role-based permissions
        - Organization isolation
        - Field-level security
        - Audit logging for security events
        
        Real-time Data Patterns:
        
        Firestore onSnapshot Implementation:
        - Live updates for note changes
        - Automatic re-rendering on data changes
        - Optimistic updates for better UX
        - Conflict resolution for concurrent edits
        - Implements change detection
        - Handles large dataset updates
        
        Proper Cleanup with useEffect:
        - Return unsubscribe functions
        - Prevent memory leaks
        - Handle component unmounting
        - Clean up event listeners
        - Cancel pending requests
        - Clear timers and intervals
        
        Error Handling for Connection Issues:
        - Network error detection
        - Retry mechanisms with exponential backoff
        - Offline state handling
        - User-friendly error messages
        - Graceful degradation
        - Recovery suggestions
        
        Optimistic Updates:
        - Immediate UI updates
        - Background data persistence
        - Rollback on failure
        - Better perceived performance
        - Conflict resolution
        - User feedback during operations
        
        UI/UX Technical Implementation:
        
        Tailwind CSS Styling:
        - Utility-first approach
        - Consistent design system
        - Responsive breakpoints (sm, md, lg, xl)
        - Dark mode support with dark: classes
        - Custom color schemes
        - Animation and transition utilities
        
        Mobile-responsive Design:
        - sm: breakpoints for mobile/desktop
        - Stacked layouts on mobile
        - Horizontal layouts on desktop
        - Touch-friendly interactions
        - Swipe gestures for mobile
        - Responsive typography
        
        Dark Mode Support:
        - dark: classes for dark theme
        - Automatic theme detection
        - User preference persistence
        - Consistent color schemes
        - High contrast mode support
        - Theme transition animations
        
        Accessibility Features:
        - ARIA labels for screen readers
        - Keyboard navigation support
        - Focus management
        - Color contrast compliance
        - Screen reader announcements
        - Voice navigation support
        
        Loading States and Error Boundaries:
        - Skeleton loaders
        - Error fallback components
        - Retry mechanisms
        - User feedback systems
        - Progressive loading
        - Error recovery flows
        
        Performance Optimizations:
        
        useCallback for Event Handlers:
        - Prevents unnecessary re-renders
        - Memoizes function references
        - Optimizes child component updates
        - Reduces render cycles
        - Implements dependency arrays
        - Handles closure dependencies
        
        Memoized Calculations (useMemo):
        - Expensive computations
        - Derived state calculations
        - Filtered data processing
        - Dependency-based memoization
        - Caches complex calculations
        - Optimizes re-render performance
        
        Efficient Firestore Queries:
        - Proper indexing for queries
        - Limit results with pagination
        - Use specific field selections
        - Optimize query patterns
        - Implement query caching
        - Use compound indexes
        
        Lazy Loading for Modal Components:
        - Code splitting for modals
        - Dynamic imports
        - Reduced initial bundle size
        - Faster page loads
        - Progressive enhancement
        - Route-based code splitting
        
        Error Handling Patterns:
        
        Try-catch Blocks for Async Operations:
        - Firestore operations
        - API calls
        - File uploads
        - Network requests
        - User input validation
        - External service calls
        
        User-friendly Error Messages:
        - Clear error descriptions
        - Actionable error guidance
        - Context-specific messages
        - Recovery suggestions
        - Localized error messages
        - Error severity levels
        
        Graceful Degradation for Network Issues:
        - Offline state handling
        - Cached data fallbacks
        - Retry mechanisms
        - Progressive enhancement
        - Service worker support
        - Background sync
        
        Validation for Form Inputs:
        - Client-side validation
        - Real-time feedback
        - Error state management
        - Accessibility compliance
        - Custom validation rules
        - Cross-field validation
        
        Integration Points:
        
        ProfilePage Integration:
        - Mentorship panels in member profiles
        - Admin mentorship management section
        - Officer role functionality
        - Member relationship display
        - Quick access to mentorship features
        - Responsive layout adaptation
        
        MemberManager Integration:
        - Mentorship column in member tables
        - Desktop and mobile responsive layouts
        - Quick access to mentorship notes
        - Member relationship indicators
        - Bulk operations for mentorship
        - Export functionality
        
        ScheduleView Integration:
        - Mentorship icons in role assignments
        - Visual indicators for mentees
        - Admin and mentor visibility controls
        - Role assignment context
        - Mentorship-aware role suggestions
        - Integration with availability system
        
        Firestore Rules Integration:
        - Security for mentorship data access
        - Role-based permissions
        - Organization data isolation
        - User authentication validation
        - Field-level security
        - Audit trail implementation
        """
        
        # Add the detailed technical implementation episode
        await graphiti.add_episode(
            name="Detailed Technical Implementation Guide",
            episode_body=technical_content,
            source_description="Comprehensive technical implementation details for Toastmasters app",
            reference_time=datetime.now()
        )
        
        print("SUCCESS: Detailed technical implementation knowledge added to Graphiti knowledge base")
        
        # Search to verify the knowledge was added
        print("\nVerifying knowledge base updates...")
        
        # Search for technical implementation
        technical_results = await graphiti.search("technical implementation", limit=3)
        print(f"Found {len(technical_results)} technical implementation entries")
        
        print("\nSUCCESS: Graphiti knowledge base successfully updated with detailed technical implementation!")
        
    except Exception as e:
        print(f"ERROR: Error updating Graphiti knowledge base: {e}")
        print("Make sure FalkorDB is running: docker run -d -p 6379:6379 falkordb/falkordb:latest")
        raise

if __name__ == "__main__":
    asyncio.run(add_technical_episode())
