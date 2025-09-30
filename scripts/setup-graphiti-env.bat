@echo off
echo Setting up Graphiti Knowledge Base Environment Variables...

REM Set Graphiti Environment Variables
set FALKORDB_HOST=localhost
set FALKORDB_PORT=6379
set GRAPHITI_TELEMETRY_ENABLED=false

REM Set OpenAI API Key (replace with your actual key)
set OPENAI_API_KEY=your-openai-api-key-here

REM Set Graphiti Knowledge Base Path
set GRAPHITI_KNOWLEDGE_BASE_PATH=./graphiti-knowledge-base

REM Set MCP Server Path
set MCP_SERVER_PATH=./graphiti-knowledge-base/core/mcp_server.py

REM Set Cursor MCP Configuration Path
set CURSOR_MCP_CONFIG=./graphiti-knowledge-base/config/cursor-mcp-config.json

echo Environment variables set for current session.
echo.
echo To make these permanent, add them to your system environment variables:
echo FALKORDB_HOST=localhost
echo FALKORDB_PORT=6379
echo GRAPHITI_TELEMETRY_ENABLED=false
echo OPENAI_API_KEY=your-openai-api-key-here
echo.
echo Next steps:
echo 1. Install Python dependencies: pip install graphiti-core[falkordb] mcp
echo 2. Start Docker Desktop
echo 3. Start FalkorDB: docker run -d --name falkordb -p 6379:6379 falkordb/falkordb:latest
echo 4. Initialize knowledge base: python graphiti-knowledge-base/core/setup_graphiti.py
echo 5. Configure Cursor with the MCP config file

