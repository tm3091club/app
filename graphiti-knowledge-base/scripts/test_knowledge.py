#!/usr/bin/env python3
"""
Test script for Graphiti Knowledge Base
This script tests the knowledge base directly to verify it's working.
"""

import asyncio
import os
from graphiti_core import Graphiti
from graphiti_core.driver.falkordb_driver import FalkorDriver
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'config'))
from config import setup_environment

async def test_knowledge_base():
    """Test the knowledge base with sample queries"""
    print("Testing Graphiti Knowledge Base...")
    
    # Set up environment from config
    setup_environment()
    
    try:
        # Connect to Graphiti
        driver = FalkorDriver(host="localhost", port=6379)
        graphiti = Graphiti(graph_driver=driver)
        print("Connected to Graphiti Knowledge Base")
        
        # Test queries
        test_queries = [
            "What is the Toastmasters app architecture?",
            "What are the user's UI preferences?",
            "How does the month selection logic work?",
            "What database does the app use?"
        ]
        
        for query in test_queries:
            print(f"\nQuery: {query}")
            try:
                results = await graphiti.search(query, num_results=2)
                print(f"   Found {len(results)} results")
                if results:
                    print(f"   Top result: {str(results[0])[:150]}...")
            except Exception as e:
                print(f"   Error: {e}")
        
        print("\nKnowledge base test completed successfully!")
        
    except Exception as e:
        print(f"Failed to connect to knowledge base: {e}")

if __name__ == "__main__":
    asyncio.run(test_knowledge_base())
