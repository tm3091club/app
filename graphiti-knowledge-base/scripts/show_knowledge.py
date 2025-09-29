#!/usr/bin/env python3
"""
Simple Knowledge Base Display
"""

import json
import os

def show_knowledge_base():
    """Display the knowledge base contents"""
    
    if not os.path.exists('../data/toastmasters_knowledge.json'):
        print("❌ Knowledge base file not found. Run view_knowledge.py first to create it.")
        return
    
    with open('../data/toastmasters_knowledge.json', 'r', encoding='utf-8') as f:
        kb = json.load(f)
    
    print("TOASTMASTERS AI AGENT KNOWLEDGE BASE")
    print("=" * 60)
    print(f"Total Episodes: {len(kb['episodes'])}")
    print(f"Created: {kb['metadata']['created'][:10]}")
    print(f"Description: {kb['metadata']['description']}")
    print()
    
    for i, episode in enumerate(kb['episodes'], 1):
        print(f"{i}. {episode['title']}")
        print(f"   Category: {episode['category']}")
        print(f"   Entities: {', '.join(episode['entities'][:3])}...")
        print(f"   Content Preview: {episode['content'][:100]}...")
        print()
    
    print("=" * 60)
    print("This knowledge base contains:")
    print("   • Project architecture and components")
    print("   • User preferences and UI guidelines")
    print("   • Recent bug fixes and solutions")
    print("   • Business logic and domain knowledge")
    print("   • Technical implementation details")
    print("   • File structure and organization")
    print()
    print("To search or view full content, run: python view_knowledge.py")

if __name__ == "__main__":
    show_knowledge_base()



