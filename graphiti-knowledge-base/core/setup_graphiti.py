#!/usr/bin/env python3
"""
Graphiti Knowledge Base Setup for Toastmasters AI Agent
This script sets up Graphiti as a persistent knowledge base for AI agents
working on the Toastmasters project.
"""

import os
import sys
from datetime import datetime
from typing import List, Dict, Any

# Try to import Graphiti - will fail gracefully if not installed
try:
    from graphiti_core import Graphiti
    from graphiti_core.driver.falkordb_driver import FalkorDriver
    GRAPHITI_AVAILABLE = True
except ImportError:
    print("❌ Graphiti not installed. Please run: pip install graphiti-core[falkordb]")
    GRAPHITI_AVAILABLE = False
    sys.exit(1)

def create_graphiti_instance():
    """Create and initialize Graphiti instance"""
    try:
        # Try FalkorDB first (lightweight option)
        driver = FalkorDriver(
            host=os.getenv("FALKORDB_HOST", "localhost"),
            port=int(os.getenv("FALKORDB_PORT", 6379))
        )
        graphiti = Graphiti(graph_driver=driver)
        print("Connected to FalkorDB")
        return graphiti
    except Exception as e:
        print(f"Failed to connect to FalkorDB: {e}")
        print("Make sure FalkorDB is running: docker run -d -p 6379:6379 falkordb/falkordb:latest")
        return None

def create_toastmasters_episodes() -> List[Dict[str, Any]]:
    """Create initial episodes about the Toastmasters project"""
    
    episodes = [
        {
            "content": """
            Toastmasters Monthly Scheduler Project Overview:
            
            This is a React + TypeScript application built with Vite that manages Toastmasters club operations.
            The app uses Firebase Firestore for data storage and authentication.
            
            Key Components:
            - React 19.1.0 with TypeScript 5.8.2
            - Vite 6.2.0 for build tooling
            - Firebase 12.0.0 for backend services
            - Tailwind CSS 4.1.11 for styling
            - Lucide React for icons
            
            Main Features:
            - Monthly schedule generation and management
            - Member management with role assignments
            - Weekly agenda creation and editing
            - Public sharing of schedules and agendas
            - Email notifications and reminders
            """,
            "entities": ["Toastmasters App", "React", "TypeScript", "Firebase", "Vite", "Tailwind CSS"]
        },
        
        {
            "content": """
            Project Architecture and File Structure:
            
            The app follows a component-based architecture with the following structure:
            
            - App.tsx: Main application component with routing logic
            - components/: React components organized by feature
              - Header.tsx: Navigation and user interface
              - ScheduleView.tsx: Monthly schedule management
              - MemberManager.tsx: Member CRUD operations
              - WeeklyAgenda.tsx: Agenda creation and editing
              - ProfilePage.tsx: User profile management
            - Context/: React context providers
              - AuthContext.tsx: Authentication state management
              - ToastmastersContext.tsx: Main app state and data operations
              - NotificationContext.tsx: Notification management
            - services/: Business logic and API services
            - types.ts: TypeScript type definitions
            - utils/: Utility functions and helpers
            
            Data Flow:
            Firebase Firestore → ToastmastersContext → React Components
            """,
            "entities": ["Project Architecture", "React Components", "Context Providers", "Firebase Firestore", "Data Flow"]
        },
        
        {
            "content": """
            User Preferences and UI/UX Guidelines:
            
            Based on user interactions and feedback:
            
            1. Git Workflow Preferences:
               - User prefers git commands for deployments and version bumping
               - All operations should be tracked in git history
            
            2. UI/UX Design Preferences:
               - Desktop/Web: Action buttons aligned on the right side
               - Mobile: Action buttons should be stacked vertically
               - Event times displayed as start time rather than time ranges
               - No print button needed (export to PDF works perfectly)
            
            3. Code Delivery Preferences:
               - Prefer creating text files in project directory over inline code
               - Use structured task lists for complex multi-step tasks
            
            4. Database and Data Management:
               - All data must stay in Firebase Firestore
               - Never introduce new databases without explicit permission
               - Reference TM App Golden Rules.md as single source of truth
            """,
            "entities": ["User Preferences", "Git Workflow", "UI/UX Design", "Mobile Responsive", "Code Delivery", "Database Rules"]
        },
        
        {
            "content": """
            Recent Bug Fixes and Solutions:
            
            1. Default Month Selection Logic Fix (Latest):
               - Issue: October not showing as default after September 24th
               - Solution: Updated getAppropriateScheduleId function in ToastmastersContext.tsx
               - Logic: After last meeting of current month passes, switch to next month if schedule exists
               - Implementation: Check if current month has future meetings, if not, look for next month schedule
               - Date handling: Added proper timezone handling with 'T00:00:00' suffix
            
            2. Month Transition System:
               - Automatic switching between monthly schedules
               - Prioritizes schedules with future meetings
               - Fallback to most recent schedule if no future meetings exist
               - Handles edge cases like year transitions (December to January)
            
            Code Patterns:
            - Use useCallback for performance optimization
            - Implement proper error handling and loading states
            - Follow React best practices for state management
            """,
            "entities": ["Bug Fixes", "Month Selection Logic", "getAppropriateScheduleId", "Date Handling", "Code Patterns"]
        },
        
        {
            "content": """
            Business Logic and Domain Knowledge:
            
            Toastmasters Club Operations:
            
            1. Meeting Structure:
               - Weekly meetings with specific roles (Toastmaster, Speakers, Table Topics Master, etc.)
               - Monthly schedules with 4-5 meetings per month
               - Role assignments with automatic rotation and preferences
            
            2. Member Management:
               - Member statuses: active, inactive, guest
               - Role qualifications: Toastmaster, Table Topics Master, General Evaluator, Past President
               - Availability tracking for meeting participation
            
            3. Schedule Generation:
               - Automatic role assignment based on member preferences and availability
               - Conflict resolution for overlapping assignments
               - Theme assignment for meetings
            
            4. Agenda Management:
               - Template-based agenda creation
               - Role-bound items that auto-update with member assignments
               - Export capabilities (PDF, TSV for spreadsheets)
               - Public sharing functionality
            
            5. Permissions Model:
               - Admins have full access to all features
               - Toastmasters can edit agendas for their assigned weeks
               - Members can view schedules and agendas
            """,
            "entities": ["Toastmasters Business Logic", "Meeting Structure", "Member Management", "Schedule Generation", "Permissions Model"]
        },
        
        {
            "content": """
            Technical Implementation Details:
            
            Key Functions and Their Purpose:
            
            1. getAppropriateScheduleId(): Determines which monthly schedule to display by default
            2. getDefaultWeek(): Automatically selects the appropriate week to show in weekly agenda
            3. loadOrCreateAgenda(): Creates or loads agenda for a specific week
            4. saveWeeklyAgenda(): Persists agenda changes to Firebase
            5. handleShare(): Creates public shareable links for agendas
            
            Data Models:
            - MonthlySchedule: Contains meetings array with role assignments
            - WeeklyAgenda: Contains agenda items, theme, and meeting info
            - Member: Contains member details, status, and qualifications
            - Organization: Contains club info, members array, and settings
            
            Firebase Collections:
            - users: User documents with schedules, members, and organization data
            - publicAgendas: Shared agenda documents accessible via public URLs
            - publicSchedules: Shared schedule documents accessible via public URLs
            
            Security Rules:
            - Users can only access their own organization's data
            - Public documents are readable by anyone with the URL
            - Admin operations require proper authentication and role verification
            """,
            "entities": ["Technical Implementation", "Key Functions", "Data Models", "Firebase Collections", "Security Rules"]
        }
    ]
    
    return episodes

async def populate_knowledge_base(graphiti):
    """Populate the knowledge base with initial episodes"""
    print("Creating knowledge episodes...")
    
    episodes = create_toastmasters_episodes()
    
    for i, episode_data in enumerate(episodes, 1):
        try:
            # Add episode to Graphiti using correct API
            from datetime import datetime
            await graphiti.add_episode(
                name=f"Toastmasters Knowledge Episode {i}",
                episode_body=episode_data["content"],
                source_description="Initial knowledge base setup",
                reference_time=datetime.now()
            )
            print(f"Episode {i}/{len(episodes)} created")
        except Exception as e:
            print(f"Failed to create episode {i}: {e}")
    
    print(f"Knowledge base populated with {len(episodes)} episodes!")

async def test_knowledge_base(graphiti):
    """Test the knowledge base with sample queries"""
    print("Testing knowledge base...")
    
    test_queries = [
        "What is the Toastmasters app architecture?",
        "How does the month selection logic work?",
        "What are the user's UI preferences?",
        "What database does the app use?"
    ]
    
    for query in test_queries:
        try:
            results = await graphiti.search(query, num_results=3)
            print(f"Query: '{query}' - Found {len(results)} results")
            if results:
                print(f"   Top result: {str(results[0])[:100]}...")
        except Exception as e:
            print(f"Query failed: {e}")

async def main():
    """Main setup function"""
    print("Setting up Graphiti Knowledge Base for Toastmasters AI Agent")
    print("=" * 60)
    
    # Disable telemetry
    os.environ["GRAPHITI_TELEMETRY_ENABLED"] = "false"
    print("Using local AI agent mode - no external API keys required")
    
    # Create Graphiti instance
    graphiti = create_graphiti_instance()
    if not graphiti:
        return
    
    # Graphiti is already initialized when created
    print("Graphiti initialized successfully")
    
    # Populate with knowledge
    await populate_knowledge_base(graphiti)
    
    # Test the knowledge base
    await test_knowledge_base(graphiti)
    
    print("\nSetup complete!")
    print("The knowledge base now contains information about:")
    print("   - Project architecture and components")
    print("   - User preferences and UI guidelines") 
    print("   - Recent bug fixes and solutions")
    print("   - Business logic and domain knowledge")
    print("   - Technical implementation details")
    print("\nNext steps:")
    print("   1. Set up MCP server for Cursor integration")
    print("   2. Configure continuous knowledge updates")
    print("   3. Test queries through AI agent interface")

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
