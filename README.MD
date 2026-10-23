README.MD:

claude mcp add openai-server \
  --env OPENAI_API_KEY="your-actual-openai-api-key" \
  -- npx tsx /absolute/path/to/openai-mcp-server/index.ts
  
  
  Check Status:Run claude mcp list in your shell.Showing:
   openai-server: npx tsx /home/alex/workspace/llm_engineering/MCP/openai-mcp-server/index.ts - ✔ Connected


Interact with the Tool:Ask Claude to invoke the OpenAI server tools directly: 
    Use the openai-server to ask OpenAI gpt-4o-mini to write a short haiku about code execution.
