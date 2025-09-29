#!/usr/bin/env python3
"""
Configuration file for Graphiti Knowledge Base
Loads environment variables and provides configuration
"""

import os
from dotenv import load_dotenv

# Load .env file if it exists
load_dotenv()

# Graphiti Configuration
GRAPHITI_CONFIG = {
    "openai_api_key": os.getenv("OPENAI_API_KEY"),
    "telemetry_enabled": os.getenv("GRAPHITI_TELEMETRY_ENABLED", "false").lower() == "true",
    "falkordb_host": os.getenv("FALKORDB_HOST", "localhost"),
    "falkordb_port": int(os.getenv("FALKORDB_PORT", "6379"))
}

def setup_environment():
    """Set up environment variables for Graphiti"""
    if not GRAPHITI_CONFIG["openai_api_key"]:
        raise ValueError("OPENAI_API_KEY not found! Please set it in your .env file or environment variables.")
    
    os.environ["OPENAI_API_KEY"] = GRAPHITI_CONFIG["openai_api_key"]
    os.environ["GRAPHITI_TELEMETRY_ENABLED"] = str(GRAPHITI_CONFIG["telemetry_enabled"]).lower()
    os.environ["FALKORDB_HOST"] = GRAPHITI_CONFIG["falkordb_host"]
    os.environ["FALKORDB_PORT"] = str(GRAPHITI_CONFIG["falkordb_port"])

if __name__ == "__main__":
    print("Graphiti Configuration:")
    if GRAPHITI_CONFIG['openai_api_key']:
        print(f"  OpenAI API Key: {'*' * 20}...{GRAPHITI_CONFIG['openai_api_key'][-10:]}")
    else:
        print("  OpenAI API Key: ❌ NOT SET")
    print(f"  Telemetry: {GRAPHITI_CONFIG['telemetry_enabled']}")
    print(f"  FalkorDB: {GRAPHITI_CONFIG['falkordb_host']}:{GRAPHITI_CONFIG['falkordb_port']}")
