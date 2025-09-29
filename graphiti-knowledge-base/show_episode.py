#!/usr/bin/env python3
"""
Show a specific episode from the knowledge base
"""

import json
import sys

def show_episode(episode_id):
    """Show a specific episode by index"""
    
    with open('toastmasters_knowledge.json', 'r', encoding='utf-8') as f:
        kb = json.load(f)
    
    if episode_id < 0 or episode_id >= len(kb['episodes']):
        print(f"ERROR: Episode {episode_id} not found. Available episodes: 0-{len(kb['episodes'])-1}")
        return
    
    episode = kb['episodes'][episode_id]
    
    print(f"Episode: {episode['title']}")
    print(f"Category: {episode['category']}")
    print(f"Created: {episode['created'][:10]}")
    print("\n" + "="*60)
    print(episode['content'])
    print("\n" + "="*60)
    print(f"Entities: {', '.join(episode['entities'])}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        try:
            episode_id = int(sys.argv[1])
            show_episode(episode_id)
        except ValueError:
            print("ERROR: Please provide a valid episode number (0-7)")
    else:
        print("Usage: python show_episode.py <episode_number>")
        print("Available episodes: 0-7")
        print("0: Project Architecture Overview")
        print("1: User Preferences and Guidelines") 
        print("2: Month Selection Logic Bug Fix")
        print("3: Toastmasters Business Logic")
        print("4: Technical Implementation Details")
        print("5: Project File Structure and Organization")
        print("6: Mentorship System Implementation")
        print("7: Detailed Technical Implementation Guide")



