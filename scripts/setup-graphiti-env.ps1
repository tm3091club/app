# Graphiti Knowledge Base Environment Setup Script
Write-Host "Setting up Graphiti Knowledge Base Environment Variables..." -ForegroundColor Green

# Set Graphiti Environment Variables
$env:FALKORDB_HOST = "localhost"
$env:FALKORDB_PORT = "6379"
$env:GRAPHITI_TELEMETRY_ENABLED = "false"

# Set OpenAI API Key (replace with your actual key)
$env:OPENAI_API_KEY = "your-openai-api-key-here"

# Set Graphiti Knowledge Base Path
$env:GRAPHITI_KNOWLEDGE_BASE_PATH = "./graphiti-knowledge-base"

# Set MCP Server Path
$env:MCP_SERVER_PATH = "./graphiti-knowledge-base/core/mcp_server.py"

# Set Cursor MCP Configuration Path
$env:CURSOR_MCP_CONFIG = "./graphiti-knowledge-base/config/cursor-mcp-config.json"

Write-Host "Environment variables set for current session." -ForegroundColor Yellow
Write-Host ""
Write-Host "To make these permanent, add them to your system environment variables:" -ForegroundColor Cyan
Write-Host "FALKORDB_HOST=localhost"
Write-Host "FALKORDB_PORT=6379"
Write-Host "GRAPHITI_TELEMETRY_ENABLED=false"
Write-Host "OPENAI_API_KEY=your-openai-api-key-here"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Green
Write-Host "1. Install Python dependencies: pip install graphiti-core[falkordb] mcp"
Write-Host "2. Start Docker Desktop"
Write-Host "3. Start FalkorDB: docker run -d --name falkordb -p 6379:6379 falkordb/falkordb:latest"
Write-Host "4. Initialize knowledge base: python graphiti-knowledge-base/core/setup_graphiti.py"
Write-Host "5. Configure Cursor with the MCP config file"