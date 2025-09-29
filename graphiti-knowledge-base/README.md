# Graphiti Knowledge Base for Toastmasters AI Agent

A persistent knowledge base built with Graphiti that serves as the memory system for AI agents working on the Toastmasters Monthly Scheduler project.

## 🎯 Purpose

The knowledge base ensures that AI agents maintain context and understanding across different chat sessions. When a new AI agent takes over or a new chat starts, they can immediately access:

- Project architecture and component understanding
- User preferences and UI/UX guidelines  
- Recent bug fixes and solutions
- Business logic and domain knowledge
- Technical implementation details
- Code patterns and best practices

## 📁 Directory Structure

```
graphiti-knowledge-base/
├── core/                    # Core functionality
│   ├── setup_graphiti.py   # Initial setup script
│   ├── mcp_server.py       # MCP server for AI agents
│   └── ingest_knowledge.py # Knowledge ingestion system
├── scripts/                 # Utility scripts
│   ├── add_technical_episode.py
│   ├── add_simple_technical_episode.py
│   ├── update_mentorship_knowledge.py
│   ├── check_knowledge.py
│   ├── test_knowledge.py
│   ├── show_episode.py
│   ├── show_knowledge.py
│   └── view_knowledge.py
├── config/                  # Configuration files
│   ├── config.py           # Configuration management
│   ├── env_template.txt    # Environment template
│   ├── cursor-mcp-config.json
│   └── docker-compose.yml  # FalkorDB setup
├── docs/                    # Documentation
│   ├── setup-instructions.md
│   ├── AUTO-START-SETUP.md
│   └── SETUP_ENV.md
└── data/                    # Data files
    └── toastmasters_knowledge.json
```

## 🚀 Quick Setup

### 1. Prerequisites
```bash
# Install Python packages
pip install graphiti-core[falkordb] mcp

# Start FalkorDB (lightweight graph database)
docker run -d --name falkordb -p 6379:6379 falkordb/falkordb:latest

# Set environment variables
export FALKORDB_HOST="localhost"
export FALKORDB_PORT="6379"
export GRAPHITI_TELEMETRY_ENABLED="false"
```

### 2. Initialize Knowledge Base
```bash
python core/setup_graphiti.py
```

### 3. Configure Cursor Integration
Add the MCP server configuration to your Cursor settings using `config/cursor-mcp-config.json`.

## 🧠 Knowledge Base Contents

The knowledge base contains structured information about:

### Project Architecture
- React + TypeScript + Vite setup
- Firebase Firestore integration
- Component structure and data flow
- Context providers and state management

### User Preferences
- Git workflow preferences (use git commands for deployments)
- UI/UX guidelines (right-aligned buttons on desktop, stacked on mobile)
- Code delivery preferences (create files vs inline code)
- Database rules (stay in Firebase, reference Golden Rules)

### Recent Solutions
- Month selection logic fix (October default after September 24th)
- Date handling improvements with timezone support
- Performance optimizations with useCallback
- Error handling and loading state patterns

### Business Logic
- Toastmasters meeting structure and roles
- Member management and qualifications
- Schedule generation algorithms
- Permission models and access control

### Technical Implementation
- Key functions and their purposes
- Data models and Firebase collections
- Security rules and authentication
- Export and sharing functionality

## 🔧 AI Agent Tools

The MCP server provides these tools for AI agents:

### `search_knowledge`
Search the knowledge base for relevant information
```json
{
  "query": "How does month selection work?",
  "limit": 5
}
```

### `add_knowledge`
Add new insights to the knowledge base
```json
{
  "content": "New insight about the project",
  "entities": ["Topic1", "Topic2"]
}
```

### `get_project_overview`
Get comprehensive project information
```json
{
  "aspect": "architecture"  // or "preferences", "bugs", "business_logic", "technical"
}
```

### `get_user_preferences`
Retrieve user preferences and guidelines

### `get_recent_changes`
Get information about recent bug fixes and changes

## 📝 Continuous Learning

Use the ingestion system to continuously update the knowledge base:

```python
# Add a bug fix
await quick_add_bug_fix(
    description="Description of the bug",
    solution="How it was fixed",
    files=["file1.tsx", "file2.ts"]
)

# Add user feedback
await quick_add_user_feedback(
    feedback_type="UI Preference",
    content="User's feedback",
    action="What was done about it"
)

# Add a feature implementation
await quick_add_feature(
    name="Feature Name",
    description="What it does",
    implementation="How it works",
    files_created=["new_file.tsx"],
    files_modified=["existing_file.tsx"]
)
```

## 🔍 Example Queries

AI agents can ask questions like:
- "What are the user's UI preferences for button alignment?"
- "How was the month selection bug fixed?"
- "What is the project's architecture?"
- "What database does the app use?"
- "What are the recent changes to the codebase?"

## 🛠 Maintenance

### Updating Knowledge
Run the ingestion script to add new insights:
```bash
python core/ingest_knowledge.py
```

### Backing Up Knowledge
The knowledge base is stored in FalkorDB. To backup:
```bash
# Export knowledge base (if supported by your FalkorDB setup)
# Or simply backup the Docker container
docker commit falkordb toastmasters-knowledge-backup
```

### Monitoring
Check the ingestion log to see what knowledge has been added:
```bash
cat ingestion_log.json
```

## 🎉 Benefits

With this knowledge base, AI agents can:
- **Maintain Context**: Remember project details across sessions
- **Follow Preferences**: Respect user's coding and UI preferences
- **Learn from History**: Build on previous solutions and fixes
- **Provide Consistency**: Give consistent advice based on established patterns
- **Scale Knowledge**: Accumulate insights over time for better assistance

## 🔧 Troubleshooting

### FalkorDB Connection Issues
```bash
# Check if FalkorDB is running
docker ps | grep falkordb

# Restart if needed
docker restart falkordb
```

### Python Import Errors
```bash
# Ensure packages are installed
pip install --upgrade graphiti-core[falkordb] mcp

# Check Python path
python -c "import graphiti_core; print('Graphiti available')"
```

### MCP Server Issues
- Check that FalkorDB is accessible on localhost:6379
- Ensure Python path includes the script directory
- Verify telemetry is disabled (GRAPHITI_TELEMETRY_ENABLED=false)

## 📚 Next Steps

1. **Test the Setup**: Run sample queries to verify everything works
2. **Populate Knowledge**: Add more project insights and solutions
3. **Integrate with Workflow**: Use the knowledge base during development
4. **Monitor and Update**: Continuously improve the knowledge base
5. **Share Knowledge**: Use insights to help other developers understand the project

This knowledge base transforms your AI assistant from a session-based helper into a persistent, learning partner that grows smarter about your project over time! 🚀
