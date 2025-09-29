#!/usr/bin/env python3
"""
Graphiti MCP Server for Cursor Integration
This server provides AI agents with access to the Toastmasters project knowledge base.
"""

import asyncio
import json
import os
import sys
from datetime import datetime
from typing import Any, Dict, List, Optional

# Add the current directory to Python path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import configuration
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'config'))
from config import setup_environment

try:
    from mcp.server import Server
    from mcp.server.stdio import stdio_server
    from mcp.types import (
        CallToolRequest,
        CallToolResult,
        ListToolsRequest,
        ListToolsResult,
        Tool,
        TextContent,
    )
    from graphiti_core import Graphiti
    from graphiti_core.driver.falkordb_driver import FalkorDriver
    MCP_AVAILABLE = True
except ImportError as e:
    print(f"❌ Required packages not installed: {e}")
    print("Install with: pip install mcp graphiti-core[falkordb]")
    MCP_AVAILABLE = False

class GraphitiMCPServer:
    def __init__(self):
        self.server = Server("graphiti-knowledge-base")
        self.graphiti = None
        self.setup_tools()
    
    async def initialize_graphiti(self):
        """Initialize Graphiti connection"""
        try:
            # Set up environment from configuration
            setup_environment()
            
            driver = FalkorDriver(
                host=os.getenv("FALKORDB_HOST", "localhost"),
                port=int(os.getenv("FALKORDB_PORT", 6379))
            )
            self.graphiti = Graphiti(graph_driver=driver)
            print("✅ Graphiti MCP Server initialized (local mode)")
        except Exception as e:
            print(f"❌ Failed to initialize Graphiti: {e}")
            raise
    
    def setup_tools(self):
        """Set up MCP tools for AI agent interaction"""
        
        @self.server.list_tools()
        async def list_tools() -> List[Tool]:
            """List available tools for AI agents"""
            return [
                Tool(
                    name="search_knowledge",
                    description="Search the Toastmasters project knowledge base for information",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "Search query about the Toastmasters project"
                            },
                            "limit": {
                                "type": "integer",
                                "description": "Maximum number of results to return",
                                "default": 5
                            }
                        },
                        "required": ["query"]
                    }
                ),
                Tool(
                    name="add_knowledge",
                    description="Add new knowledge about the Toastmasters project",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "content": {
                                "type": "string",
                                "description": "Knowledge content to add"
                            },
                            "entities": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "List of entities/topics this knowledge relates to"
                            }
                        },
                        "required": ["content", "entities"]
                    }
                ),
                Tool(
                    name="get_project_overview",
                    description="Get a comprehensive overview of the Toastmasters project",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "aspect": {
                                "type": "string",
                                "description": "Specific aspect to focus on (architecture, preferences, bugs, business_logic, technical)",
                                "default": "all"
                            }
                        }
                    }
                ),
                Tool(
                    name="get_user_preferences",
                    description="Get user preferences and guidelines for the project",
                    inputSchema={
                        "type": "object",
                        "properties": {}
                    }
                ),
                Tool(
                    name="get_recent_changes",
                    description="Get information about recent bug fixes and changes",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "limit": {
                                "type": "integer",
                                "description": "Number of recent changes to retrieve",
                                "default": 5
                            }
                        }
                    }
                )
            ]
        
        @self.server.call_tool()
        async def call_tool(name: str, arguments: Dict[str, Any]) -> CallToolResult:
            """Handle tool calls from AI agents"""
            try:
                if not self.graphiti:
                    await self.initialize_graphiti()
                
                if name == "search_knowledge":
                    return await self.handle_search_knowledge(arguments)
                elif name == "add_knowledge":
                    return await self.handle_add_knowledge(arguments)
                elif name == "get_project_overview":
                    return await self.handle_get_project_overview(arguments)
                elif name == "get_user_preferences":
                    return await self.handle_get_user_preferences(arguments)
                elif name == "get_recent_changes":
                    return await self.handle_get_recent_changes(arguments)
                else:
                    return CallToolResult(
                        content=[TextContent(type="text", text=f"Unknown tool: {name}")]
                    )
            except Exception as e:
                return CallToolResult(
                    content=[TextContent(type="text", text=f"Error: {str(e)}")]
                )
    
    async def handle_search_knowledge(self, arguments: Dict[str, Any]) -> CallToolResult:
        """Handle knowledge search requests"""
        query = arguments.get("query", "")
        limit = arguments.get("limit", 5)
        
        try:
            results = await self.graphiti.search(query, limit=limit)
            
            if not results:
                return CallToolResult(
                    content=[TextContent(type="text", text="No relevant information found.")]
                )
            
            response = f"Found {len(results)} relevant results:\n\n"
            for i, result in enumerate(results, 1):
                response += f"{i}. {result.content[:200]}...\n"
                if hasattr(result, 'entities') and result.entities:
                    response += f"   Entities: {', '.join(result.entities[:3])}\n"
                response += "\n"
            
            return CallToolResult(
                content=[TextContent(type="text", text=response)]
            )
        except Exception as e:
            return CallToolResult(
                content=[TextContent(type="text", text=f"Search failed: {str(e)}")]
            )
    
    async def handle_add_knowledge(self, arguments: Dict[str, Any]) -> CallToolResult:
        """Handle adding new knowledge to the base"""
        content = arguments.get("content", "")
        entities = arguments.get("entities", [])
        
        try:
            await self.graphiti.add_episode(content=content, entities=entities)
            return CallToolResult(
                content=[TextContent(type="text", text="Knowledge successfully added to the base.")]
            )
        except Exception as e:
            return CallToolResult(
                content=[TextContent(type="text", text=f"Failed to add knowledge: {str(e)}")]
            )
    
    async def handle_get_project_overview(self, arguments: Dict[str, Any]) -> CallToolResult:
        """Get comprehensive project overview"""
        aspect = arguments.get("aspect", "all")
        
        try:
            if aspect == "all":
                query = "Toastmasters project architecture components React TypeScript Firebase"
            elif aspect == "preferences":
                query = "user preferences UI guidelines git workflow"
            elif aspect == "bugs":
                query = "bug fixes solutions month selection logic"
            elif aspect == "business_logic":
                query = "Toastmasters business logic meeting structure member management"
            elif aspect == "technical":
                query = "technical implementation data models Firebase collections"
            else:
                query = aspect
            
            results = await self.graphiti.search(query, limit=3)
            
            if not results:
                return CallToolResult(
                    content=[TextContent(type="text", text="No information found for the requested aspect.")]
                )
            
            response = f"Project Overview - {aspect.upper()}:\n\n"
            for result in results:
                response += f"• {result.content}\n\n"
            
            return CallToolResult(
                content=[TextContent(type="text", text=response)]
            )
        except Exception as e:
            return CallToolResult(
                content=[TextContent(type="text", text=f"Failed to get overview: {str(e)}")]
            )
    
    async def handle_get_user_preferences(self, arguments: Dict[str, Any]) -> CallToolResult:
        """Get user preferences and guidelines"""
        try:
            results = await self.graphiti.search("user preferences UI guidelines git workflow", limit=2)
            
            if not results:
                return CallToolResult(
                    content=[TextContent(type="text", text="No user preferences found in knowledge base.")]
                )
            
            response = "User Preferences and Guidelines:\n\n"
            for result in results:
                response += f"{result.content}\n\n"
            
            return CallToolResult(
                content=[TextContent(type="text", text=response)]
            )
        except Exception as e:
            return CallToolResult(
                content=[TextContent(type="text", text=f"Failed to get preferences: {str(e)}")]
            )
    
    async def handle_get_recent_changes(self, arguments: Dict[str, Any]) -> CallToolResult:
        """Get information about recent changes"""
        limit = arguments.get("limit", 5)
        
        try:
            results = await self.graphiti.search("bug fixes solutions recent changes", limit=limit)
            
            if not results:
                return CallToolResult(
                    content=[TextContent(type="text", text="No recent changes found in knowledge base.")]
                )
            
            response = f"Recent Changes and Bug Fixes:\n\n"
            for i, result in enumerate(results, 1):
                response += f"{i}. {result.content[:300]}...\n\n"
            
            return CallToolResult(
                content=[TextContent(type="text", text=response)]
            )
        except Exception as e:
            return CallToolResult(
                content=[TextContent(type="text", text=f"Failed to get recent changes: {str(e)}")]
            )
    
    async def run(self):
        """Run the MCP server"""
        if not MCP_AVAILABLE:
            print("❌ MCP packages not available. Install with: pip install mcp graphiti-core[falkordb]")
            return
        
        async with stdio_server() as (read_stream, write_stream):
            await self.server.run(
                read_stream,
                write_stream,
                self.server.create_initialization_options()
            )

async def main():
    """Main function to run the MCP server"""
    server = GraphitiMCPServer()
    await server.run()

if __name__ == "__main__":
    asyncio.run(main())
