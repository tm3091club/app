#!/usr/bin/env python3
"""
Knowledge Ingestion Script for Toastmasters AI Agent
This script helps AI agents continuously update the knowledge base with new insights,
solutions, and learnings about the Toastmasters project.
"""

import asyncio
import json
import os
import sys
from datetime import datetime
from typing import Dict, List, Any, Optional

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
    print("❌ Graphiti not installed. Please run: pip install graphiti-core[falkordb]")
    GRAPHITI_AVAILABLE = False
    sys.exit(1)

class KnowledgeIngestionManager:
    def __init__(self):
        self.graphiti = None
        self.ingestion_log = []
    
    async def initialize(self):
        """Initialize Graphiti connection"""
        try:
            # Set up environment
            setup_environment()
            
            driver = FalkorDriver(
                host=os.getenv("FALKORDB_HOST", "localhost"),
                port=int(os.getenv("FALKORDB_PORT", "6379"))
            )
            self.graphiti = Graphiti(graph_driver=driver)
            print("✅ Knowledge Ingestion Manager initialized")
        except Exception as e:
            print(f"❌ Failed to initialize: {e}")
            raise
    
    async def add_insight(self, 
                         title: str, 
                         content: str, 
                         category: str,
                         entities: List[str],
                         tags: Optional[List[str]] = None) -> bool:
        """Add a new insight to the knowledge base"""
        try:
            # Create structured content
            structured_content = f"""
            {title}
            
            Category: {category}
            Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
            
            {content}
            """
            
            if tags:
                structured_content += f"\nTags: {', '.join(tags)}"
            
            # Add to Graphiti
            await self.graphiti.add_episode(
                content=structured_content,
                entities=entities
            )
            
            # Log the ingestion
            self.ingestion_log.append({
                "timestamp": datetime.now().isoformat(),
                "title": title,
                "category": category,
                "entities": entities
            })
            
            print(f"✅ Added insight: {title}")
            return True
            
        except Exception as e:
            print(f"❌ Failed to add insight '{title}': {e}")
            return False
    
    async def add_bug_fix(self, 
                         bug_description: str, 
                         solution: str, 
                         files_changed: List[str],
                         testing_notes: str = "") -> bool:
        """Add information about a bug fix"""
        return await self.add_insight(
            title=f"Bug Fix: {bug_description[:50]}...",
            content=f"""
            Bug Description: {bug_description}
            
            Solution Implemented:
            {solution}
            
            Files Modified:
            {chr(10).join(f'- {file}' for file in files_changed)}
            
            Testing Notes:
            {testing_notes if testing_notes else 'No specific testing notes provided.'}
            """,
            category="bug_fix",
            entities=["Bug Fix", "Solution", "Code Change"] + files_changed,
            tags=["bug", "fix", "solution"]
        )
    
    async def add_feature_implementation(self, 
                                       feature_name: str, 
                                       description: str, 
                                       implementation_details: str,
                                       files_created: List[str],
                                       files_modified: List[str]) -> bool:
        """Add information about a new feature implementation"""
        return await self.add_insight(
            title=f"Feature: {feature_name}",
            content=f"""
            Feature Description: {description}
            
            Implementation Details:
            {implementation_details}
            
            Files Created:
            {chr(10).join(f'- {file}' for file in files_created)}
            
            Files Modified:
            {chr(10).join(f'- {file}' for file in files_modified)}
            """,
            category="feature",
            entities=["Feature", "Implementation", feature_name] + files_created + files_modified,
            tags=["feature", "implementation", "new"]
        )
    
    async def add_user_feedback(self, 
                               feedback_type: str, 
                               content: str, 
                               action_taken: str) -> bool:
        """Add user feedback and actions taken"""
        return await self.add_insight(
            title=f"User Feedback: {feedback_type}",
            content=f"""
            Feedback Type: {feedback_type}
            
            User Input:
            {content}
            
            Action Taken:
            {action_taken}
            """,
            category="user_feedback",
            entities=["User Feedback", feedback_type, "Action Taken"],
            tags=["feedback", "user", "action"]
        )
    
    async def add_architecture_decision(self, 
                                      decision: str, 
                                      rationale: str, 
                                      alternatives_considered: List[str],
                                      impact: str) -> bool:
        """Add architectural decisions and their rationale"""
        return await self.add_insight(
            title=f"Architecture Decision: {decision[:50]}...",
            content=f"""
            Decision: {decision}
            
            Rationale:
            {rationale}
            
            Alternatives Considered:
            {chr(10).join(f'- {alt}' for alt in alternatives_considered)}
            
            Impact:
            {impact}
            """,
            category="architecture",
            entities=["Architecture Decision", "Rationale", "Impact"],
            tags=["architecture", "decision", "design"]
        )
    
    async def search_knowledge(self, query: str, limit: int = 5) -> List[Any]:
        """Search the knowledge base"""
        try:
            return await self.graphiti.search(query, limit=limit)
        except Exception as e:
            print(f"❌ Search failed: {e}")
            return []
    
    async def get_knowledge_summary(self) -> Dict[str, Any]:
        """Get a summary of the knowledge base"""
        try:
            # Get counts by category
            categories = ["bug_fix", "feature", "user_feedback", "architecture", "general"]
            summary = {}
            
            for category in categories:
                results = await self.graphiti.search(f"category: {category}", limit=10)
                summary[category] = len(results)
            
            # Get recent entries
            recent_results = await self.graphiti.search("recent", limit=5)
            summary["recent_entries"] = [r.content[:100] + "..." for r in recent_results]
            
            summary["total_insights"] = len(self.ingestion_log)
            summary["last_updated"] = datetime.now().isoformat()
            
            return summary
            
        except Exception as e:
            print(f"❌ Failed to get summary: {e}")
            return {}
    
    def save_ingestion_log(self, filename: str = "ingestion_log.json"):
        """Save the ingestion log to a file"""
        try:
            with open(filename, 'w') as f:
                json.dump(self.ingestion_log, f, indent=2)
            print(f"✅ Ingestion log saved to {filename}")
        except Exception as e:
            print(f"❌ Failed to save log: {e}")

# Convenience functions for AI agents to use
async def quick_add_bug_fix(description: str, solution: str, files: List[str]):
    """Quick function to add a bug fix"""
    manager = KnowledgeIngestionManager()
    await manager.initialize()
    await manager.add_bug_fix(description, solution, files)
    await manager.save_ingestion_log()

async def quick_add_feature(name: str, description: str, implementation: str, files_created: List[str], files_modified: List[str]):
    """Quick function to add a feature implementation"""
    manager = KnowledgeIngestionManager()
    await manager.initialize()
    await manager.add_feature_implementation(name, description, implementation, files_created, files_modified)
    await manager.save_ingestion_log()

async def quick_add_user_feedback(feedback_type: str, content: str, action: str):
    """Quick function to add user feedback"""
    manager = KnowledgeIngestionManager()
    await manager.initialize()
    await manager.add_user_feedback(feedback_type, content, action)
    await manager.save_ingestion_log()

# Example usage and testing
async def main():
    """Example usage of the knowledge ingestion system"""
    print("🧠 Knowledge Ingestion System for Toastmasters AI Agent")
    print("=" * 60)
    
    manager = KnowledgeIngestionManager()
    await manager.initialize()
    
    # Example: Add a bug fix
    await manager.add_bug_fix(
        bug_description="October not showing as default month after September 24th",
        solution="Updated getAppropriateScheduleId function to check if current month has future meetings, if not, switch to next month",
        files_changed=["Context/ToastmastersContext.tsx"],
        testing_notes="Verified that October schedule now appears as default after September 24th passes"
    )
    
    # Example: Add user feedback
    await manager.add_user_feedback(
        feedback_type="UI Preference",
        content="User prefers action buttons aligned right on desktop, stacked on mobile",
        action_taken="Updated button layout in components to follow responsive design patterns"
    )
    
    # Get summary
    summary = await manager.get_knowledge_summary()
    print(f"\n📊 Knowledge Base Summary:")
    print(f"   Total insights: {summary.get('total_insights', 0)}")
    print(f"   Bug fixes: {summary.get('bug_fix', 0)}")
    print(f"   Features: {summary.get('feature', 0)}")
    print(f"   User feedback: {summary.get('user_feedback', 0)}")
    
    # Save log
    manager.save_ingestion_log()
    
    print("\n✅ Knowledge ingestion examples completed!")

if __name__ == "__main__":
    asyncio.run(main())
