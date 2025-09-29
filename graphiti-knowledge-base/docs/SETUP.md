# Graphiti Knowledge Base Setup Guide

## Quick Start

1. **Install Dependencies**
   ```bash
   pip install graphiti-core[falkordb] mcp
   ```

2. **Start FalkorDB**
   ```bash
   docker run -d --name falkordb -p 6379:6379 falkordb/falkordb:latest
   ```

3. **Set Environment Variables**
   ```bash
   export FALKORDB_HOST="localhost"
   export FALKORDB_PORT="6379"
   export GRAPHITI_TELEMETRY_ENABLED="false"
   ```

4. **Initialize Knowledge Base**
   ```bash
   python core/setup_graphiti.py
   ```

5. **Configure Cursor**
   - Copy `config/cursor-mcp-config.json` to your Cursor settings
   - Restart Cursor

## Configuration

- **Environment**: Copy `config/env_template.txt` to `.env` and update values
- **Docker**: Use `config/docker-compose.yml` for persistent FalkorDB setup
- **MCP**: Use `config/cursor-mcp-config.json` for Cursor integration

## Testing

```bash
# Test knowledge base
python scripts/test_knowledge.py

# Check knowledge
python scripts/check_knowledge.py

# View knowledge
python scripts/view_knowledge.py
```

## Troubleshooting

- **FalkorDB not running**: `docker ps | grep falkordb`
- **Python import errors**: `pip install --upgrade graphiti-core[falkordb] mcp`
- **MCP server issues**: Check FalkorDB connection and restart Cursor
