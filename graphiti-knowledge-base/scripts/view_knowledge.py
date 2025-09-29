#!/usr/bin/env python3
"""
Knowledge Base Viewer for Toastmasters AI Agent
This script shows the actual knowledge base contents that would be stored in Graphiti.
"""

import json
import os
from datetime import datetime
from typing import Dict, List, Any

class KnowledgeBaseViewer:
    def __init__(self):
        self.knowledge_base_file = "../data/toastmasters_knowledge.json"
        self.knowledge_base = self.load_or_create_knowledge_base()
    
    def load_or_create_knowledge_base(self) -> Dict[str, Any]:
        """Load existing knowledge base or create initial one"""
        if os.path.exists(self.knowledge_base_file):
            with open(self.knowledge_base_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        else:
            return self.create_initial_knowledge_base()
    
    def create_initial_knowledge_base(self) -> Dict[str, Any]:
        """Create the initial knowledge base with project information"""
        knowledge_base = {
            "metadata": {
                "created": datetime.now().isoformat(),
                "version": "1.0",
                "description": "Toastmasters AI Agent Knowledge Base",
                "total_episodes": 6
            },
            "episodes": [
                {
                    "id": "project_architecture",
                    "title": "Project Architecture Overview",
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
                    "entities": ["Toastmasters App", "React", "TypeScript", "Firebase", "Vite", "Tailwind CSS"],
                    "category": "architecture",
                    "created": datetime.now().isoformat()
                },
                {
                    "id": "user_preferences",
                    "title": "User Preferences and Guidelines",
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
                    "entities": ["User Preferences", "Git Workflow", "UI/UX Design", "Mobile Responsive", "Code Delivery", "Database Rules"],
                    "category": "preferences",
                    "created": datetime.now().isoformat()
                },
                {
                    "id": "month_selection_bug_fix",
                    "title": "Month Selection Logic Bug Fix",
                    "content": """
                    Recent Bug Fix: Default Month Selection Logic
                    
                    Issue: October not showing as default after September 24th
                    
                    Solution Implemented:
                    - Updated getAppropriateScheduleId function in ToastmastersContext.tsx
                    - Added logic to check if current month has future meetings
                    - If no future meetings in current month, automatically switch to next month
                    - Added proper timezone handling with 'T00:00:00' suffix
                    
                    Files Modified:
                    - Context/ToastmastersContext.tsx (lines 203-267)
                    
                    Testing Notes:
                    - Verified that October schedule now appears as default after September 24th passes
                    - Confirmed proper handling of year transitions (December to January)
                    - Tested edge cases with invalid dates and missing schedules
                    
                    Code Pattern Used:
                    - useCallback for performance optimization
                    - Proper error handling and loading states
                    - React best practices for state management
                    """,
                    "entities": ["Bug Fix", "Month Selection Logic", "getAppropriateScheduleId", "Date Handling", "Code Patterns"],
                    "category": "bug_fix",
                    "created": datetime.now().isoformat()
                },
                {
                    "id": "business_logic",
                    "title": "Toastmasters Business Logic",
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
                    "entities": ["Toastmasters Business Logic", "Meeting Structure", "Member Management", "Schedule Generation", "Permissions Model"],
                    "category": "business_logic",
                    "created": datetime.now().isoformat()
                },
                {
                    "id": "technical_implementation",
                    "title": "Technical Implementation Details",
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
                    "entities": ["Technical Implementation", "Key Functions", "Data Models", "Firebase Collections", "Security Rules"],
                    "category": "technical",
                    "created": datetime.now().isoformat()
                },
                {
                    "id": "file_structure",
                    "title": "Project File Structure and Organization",
                    "content": """
                    Project File Structure and Organization:
                    
                    The app follows a component-based architecture with the following structure:
                    
                    Root Level:
                    - App.tsx: Main application component with routing logic
                    - types.ts: TypeScript type definitions
                    - Constants.ts: Application constants and configuration
                    
                    components/: React components organized by feature
                    - Header.tsx: Navigation and user interface
                    - ScheduleView.tsx: Monthly schedule management
                    - MemberManager.tsx: Member CRUD operations
                    - WeeklyAgenda.tsx: Agenda creation and editing
                    - ProfilePage.tsx: User profile management
                    - common/: Shared components (ErrorBoundary, ShareModal)
                    - schedule/: Schedule-specific components
                    
                    Context/: React context providers
                    - AuthContext.tsx: Authentication state management
                    - ToastmastersContext.tsx: Main app state and data operations
                    - NotificationContext.tsx: Notification management
                    
                    services/: Business logic and API services
                    - firebase.ts: Firebase configuration and setup
                    - Various service files for different functionalities
                    
                    utils/: Utility functions and helpers
                    - monthUtils.ts: Date and month manipulation utilities
                    - version.ts: Version management utilities
                    - adminTransitionUtils.ts: Admin transition system utilities
                    
                    Data Flow:
                    Firebase Firestore → ToastmastersContext → React Components
                    """,
                    "entities": ["Project Architecture", "React Components", "Context Providers", "Firebase Firestore", "Data Flow", "File Structure"],
                    "category": "architecture",
                    "created": datetime.now().isoformat()
                }
            ]
        }
        
        # Save the initial knowledge base
        self.save_knowledge_base(knowledge_base)
        return knowledge_base
    
    def save_knowledge_base(self, knowledge_base: Dict[str, Any]):
        """Save the knowledge base to file"""
        with open(self.knowledge_base_file, 'w', encoding='utf-8') as f:
            json.dump(knowledge_base, f, indent=2, ensure_ascii=False)
    
    def search_knowledge(self, query: str) -> List[Dict[str, Any]]:
        """Search the knowledge base for relevant information"""
        query_lower = query.lower()
        results = []
        
        for episode in self.knowledge_base["episodes"]:
            content_lower = episode["content"].lower()
            entities_lower = " ".join(episode["entities"]).lower()
            title_lower = episode["title"].lower()
            
            # Calculate relevance score based on matches
            score = 0
            if query_lower in title_lower:
                score += 3
            if query_lower in content_lower:
                score += 2
            if any(term in content_lower for term in query_lower.split()):
                score += 1
            if any(term in entities_lower for term in query_lower.split()):
                score += 1
            
            if score > 0:
                results.append({
                    **episode,
                    "relevance_score": score
                })
        
        # Sort by relevance score
        results.sort(key=lambda x: x["relevance_score"], reverse=True)
        return results
    
    def display_episode(self, episode: Dict[str, Any]):
        """Display a single episode"""
        print(f"\n📄 {episode['title']}")
        print(f"   Category: {episode['category']}")
        print(f"   Entities: {', '.join(episode['entities'][:5])}")
        if len(episode['entities']) > 5:
            print(f"              {', '.join(episode['entities'][5:])}")
        print(f"   Created: {episode['created'][:10]}")
        print(f"\n{episode['content'].strip()}")
        print("-" * 80)
    
    def display_summary(self):
        """Display knowledge base summary"""
        print("🧠 TOASTMASTERS AI AGENT KNOWLEDGE BASE")
        print("=" * 60)
        print(f"📊 Total Episodes: {len(self.knowledge_base['episodes'])}")
        print(f"🕒 Created: {self.knowledge_base['metadata']['created'][:10]}")
        print(f"📝 Description: {self.knowledge_base['metadata']['description']}")
        print()
        
        # Group by category
        categories = {}
        for episode in self.knowledge_base["episodes"]:
            cat = episode["category"]
            if cat not in categories:
                categories[cat] = []
            categories[cat].append(episode["title"])
        
        print("📁 Knowledge Categories:")
        for category, titles in categories.items():
            print(f"   {category}: {len(titles)} episodes")
            for title in titles:
                print(f"      • {title}")
        print()
    
    def interactive_search(self):
        """Run interactive search interface"""
        while True:
            print("\n🔍 Knowledge Base Search")
            print("=" * 40)
            query = input("Enter search query (or 'quit' to exit): ").strip()
            
            if query.lower() in ['quit', 'exit', 'q']:
                break
            
            if not query:
                continue
            
            results = self.search_knowledge(query)
            
            if not results:
                print(f"\n❌ No results found for '{query}'")
                continue
            
            print(f"\n✅ Found {len(results)} results for '{query}':")
            
            for i, result in enumerate(results, 1):
                print(f"\n{i}. {result['title']}")
                print(f"   Category: {result['category']}")
                print(f"   Relevance: {result['relevance_score']}/5")
                print(f"   Preview: {result['content'][:150]}...")
            
            # Ask if user wants to see full content
            if results:
                try:
                    choice = input(f"\nEnter number (1-{len(results)}) to view full content, or press Enter to continue: ").strip()
                    if choice.isdigit() and 1 <= int(choice) <= len(results):
                        self.display_episode(results[int(choice) - 1])
                except (ValueError, IndexError):
                    pass

def main():
    """Main function"""
    viewer = KnowledgeBaseViewer()
    
    print("🚀 Toastmasters AI Agent Knowledge Base Viewer")
    print("=" * 60)
    
    while True:
        print("\n📋 What would you like to do?")
        print("1. View knowledge base summary")
        print("2. Search knowledge base")
        print("3. View all episodes")
        print("4. View episodes by category")
        print("5. Exit")
        
        choice = input("\nEnter your choice (1-5): ").strip()
        
        if choice == "1":
            viewer.display_summary()
            
        elif choice == "2":
            viewer.interactive_search()
            
        elif choice == "3":
            print("\n📚 All Knowledge Episodes:")
            print("=" * 60)
            for episode in viewer.knowledge_base["episodes"]:
                viewer.display_episode(episode)
            
        elif choice == "4":
            # Group by category
            categories = {}
            for episode in viewer.knowledge_base["episodes"]:
                cat = episode["category"]
                if cat not in categories:
                    categories[cat] = []
                categories[cat].append(episode)
            
            print("\n📁 Available categories:")
            for i, category in enumerate(categories.keys(), 1):
                print(f"   {i}. {category}")
            
            try:
                cat_choice = input("\nEnter category name: ").strip()
                if cat_choice in categories:
                    print(f"\n📁 Episodes in '{cat_choice}' category:")
                    for episode in categories[cat_choice]:
                        viewer.display_episode(episode)
                else:
                    print(f"\n❌ Category '{cat_choice}' not found")
            except Exception as e:
                print(f"Error: {e}")
                
        elif choice == "5":
            print("\n👋 Goodbye! This is your AI agent's knowledge base.")
            print("💡 In the full Graphiti setup, this would be stored in a graph database")
            print("   and accessible to AI agents through the MCP server.")
            break
            
        else:
            print("\n❌ Invalid choice. Please enter 1-5.")

if __name__ == "__main__":
    main()



