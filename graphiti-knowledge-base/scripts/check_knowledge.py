#!/usr/bin/env python3
"""
Check what's currently in the Graphiti knowledge base
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

async def check_knowledge():
    """Check what's currently in the Graphiti knowledge base"""
    
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
        
        # Search for mentorship system
        print("\nSearching for mentorship system...")
        mentorship_results = await graphiti.search("mentorship system", num_results=5)
        print(f"Found {len(mentorship_results)} mentorship-related entries")
        
        for i, result in enumerate(mentorship_results):
            print(f"\nEntry {i+1}:")
            print(f"Content preview: {str(result)[:200]}...")
        
        # Search for technical implementation
        print("\nSearching for technical implementation...")
        technical_results = await graphiti.search("technical implementation", num_results=5)
        print(f"Found {len(technical_results)} technical implementation entries")
        
        for i, result in enumerate(technical_results):
            print(f"\nEntry {i+1}:")
            print(f"Content preview: {str(result)[:200]}...")
        
        # Search for any recent entries
        print("\nSearching for recent entries...")
        recent_results = await graphiti.search("Toastmasters", num_results=5)
        print(f"Found {len(recent_results)} Toastmasters-related entries")
        
        for i, result in enumerate(recent_results):
            print(f"\nEntry {i+1}:")
            print(f"Content preview: {str(result)[:200]}...")
        
        print("\nSUCCESS: Knowledge base check completed!")
        
    except Exception as e:
        print(f"ERROR: Error checking Graphiti knowledge base: {e}")
        print("Make sure FalkorDB is running: docker run -d -p 6379:6379 falkordb/falkordb:latest")
        raise

if __name__ == "__main__":
    asyncio.run(check_knowledge())
