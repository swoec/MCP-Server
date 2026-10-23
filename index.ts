import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("Error: OPENAI_API_KEY environment variable is required.");
  process.exit(1);
}

// Initialize OpenAI client
const openai = new OpenAI({ apiKey });

// Initialize MCP Server
const server = new Server(
  {
    name: "openai-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 1. Define available tools with clean schemas and unambiguous descriptions
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "openai_generate_completion",
        description:
          "Sends a prompt to OpenAI models (e.g., gpt-4o, gpt-4o-mini) to generate a structured completion response. Use this when specialized multi-model verification or text generation is needed.",
        inputSchema: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description: "The user query or prompt to send to OpenAI.",
            },
            model: {
              type: "string",
              enum: ["gpt-4o", "gpt-4o-mini"],
              default: "gpt-4o-mini",
              description: "The OpenAI model to use for completion.",
            },
          },
          required: ["prompt"],
        },
      },
      {
        name: "openai_create_embeddings",
        description:
          "Generates vector embeddings for input text using OpenAI text-embedding models.",
        inputSchema: {
          type: "object",
          properties: {
            text: {
              type: "string",
              description: "Text input to convert into vector embeddings.",
            },
            model: {
              type: "string",
              default: "text-embedding-3-small",
              description: "Embedding model to use.",
            },
          },
          required: ["text"],
        },
      },
    ],
  };
});

// 2. Handle Tool Invocations with robust error handling
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "openai_generate_completion") {
      const prompt = String(args?.prompt);
      const model = String(args?.model || "gpt-4o-mini");

      const response = await openai.chat.completions.create({
        model: model,
        messages: [{ role: "user", content: prompt }],
      });

      const textOutput = response.choices[0]?.message?.content || "No response text.";

      return {
        content: [
          {
            type: "text",
            text: textOutput,
          },
        ],
      };
    }

    if (name === "openai_create_embeddings") {
      const text = String(args?.text);
      const model = String(args?.model || "text-embedding-3-small");

      const response = await openai.embeddings.create({
        model: model,
        input: text,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              embedding: response.data[0].embedding,
              dimensions: response.data[0].embedding.length,
            }),
          },
        ],
      };
    }

    throw new Error(`Tool not found: ${name}`);
  } catch (error: any) {
    // Return structured actionable errors to aid the calling model
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `[MCP OpenAI Error]: ${error.message || String(error)}`,
        },
      ],
    };
  }
});

// 3. Start the server using standard stdio transport
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

runServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});