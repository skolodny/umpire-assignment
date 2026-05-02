import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios, { AxiosInstance } from "axios";

const API_BASE = process.env.UMPIRE_API_URL || "http://localhost:8000";
const ADMIN_EMAIL = process.env.UMPIRE_ADMIN_EMAIL || "";
const ADMIN_PASSWORD = process.env.UMPIRE_ADMIN_PASSWORD || "";

let apiToken: string | null = null;

async function getApiClient(): Promise<AxiosInstance> {
  if (!apiToken) {
    const form = new URLSearchParams();
    form.append("username", ADMIN_EMAIL);
    form.append("password", ADMIN_PASSWORD);
    const resp = await axios.post(`${API_BASE}/auth/login`, form.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    apiToken = resp.data.access_token;
  }
  return axios.create({
    baseURL: API_BASE,
    headers: { Authorization: `Bearer ${apiToken}` },
  });
}

const server = new Server(
  { name: "umpire-assignment-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "get_umpire_availability",
      description: "Get availability slots for a specific umpire and optional month",
      inputSchema: {
        type: "object",
        properties: {
          user_id: { type: "number", description: "Umpire user ID" },
          month: { type: "string", description: "Month in YYYY-MM format (optional)" },
        },
        required: ["user_id"],
      },
    },
    {
      name: "set_availability",
      description: "Add an availability slot for the current user",
      inputSchema: {
        type: "object",
        properties: {
          date: { type: "string", description: "Date in YYYY-MM-DD format" },
          start_time: { type: "string", description: "Start time HH:MM" },
          end_time: { type: "string", description: "End time HH:MM" },
        },
        required: ["date", "start_time", "end_time"],
      },
    },
    {
      name: "get_division_preferences",
      description: "Get division preferences for a user",
      inputSchema: {
        type: "object",
        properties: {
          user_id: { type: "number", description: "User ID (admin only; omit for current user)" },
        },
      },
    },
    {
      name: "set_division_preferences",
      description: "Set division preferences for the current user",
      inputSchema: {
        type: "object",
        properties: {
          divisions: {
            type: "array",
            items: { type: "string", enum: ["rookies", "int_i", "int_ii"] },
            description: "List of divisions to prefer",
          },
        },
        required: ["divisions"],
      },
    },
    {
      name: "list_games",
      description: "List all imported games (admin only). Optionally filter by month.",
      inputSchema: {
        type: "object",
        properties: {
          month: { type: "string", description: "Month in YYYY-MM format (optional)" },
        },
      },
    },
    {
      name: "get_eligible_umpires",
      description: "Get eligible umpires for a specific game (admin only)",
      inputSchema: {
        type: "object",
        properties: {
          game_id: { type: "number", description: "Game ID" },
        },
        required: ["game_id"],
      },
    },
    {
      name: "assign_game",
      description: "Assign an umpire to a game (admin only). Sends notification email.",
      inputSchema: {
        type: "object",
        properties: {
          game_id: { type: "number", description: "Game ID" },
          umpire_id: { type: "number", description: "Umpire user ID" },
        },
        required: ["game_id", "umpire_id"],
      },
    },
    {
      name: "list_assignments",
      description: "List assignments. Admin sees all; umpires see their own.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "respond_to_assignment",
      description: "Accept or decline an assignment",
      inputSchema: {
        type: "object",
        properties: {
          assignment_id: { type: "number", description: "Assignment ID" },
          action: { type: "string", enum: ["accept", "decline"], description: "Response action" },
        },
        required: ["assignment_id", "action"],
      },
    },
    {
      name: "list_umpires",
      description: "List all registered umpires with their division preferences (admin only)",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "sync_games",
      description: "Trigger a re-sync of the iCal games feed (admin only)",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const client = await getApiClient();

  try {
    switch (name) {
      case "get_umpire_availability": {
        const { user_id, month } = args as { user_id: number; month?: string };
        const resp = await client.get("/availability", { params: { user_id, month } });
        return { content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }] };
      }

      case "set_availability": {
        const { date, start_time, end_time } = args as { date: string; start_time: string; end_time: string };
        const resp = await client.post("/availability", { date, start_time, end_time });
        return { content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }] };
      }

      case "get_division_preferences": {
        const resp = await client.get("/preferences");
        return { content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }] };
      }

      case "set_division_preferences": {
        const { divisions } = args as { divisions: string[] };
        const resp = await client.put("/preferences", { divisions });
        return { content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }] };
      }

      case "list_games": {
        const { month } = args as { month?: string };
        const resp = await client.get("/games", { params: { month } });
        return { content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }] };
      }

      case "get_eligible_umpires": {
        const { game_id } = args as { game_id: number };
        const resp = await client.get(`/games/${game_id}/eligible-umpires`);
        return { content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }] };
      }

      case "assign_game": {
        const { game_id, umpire_id } = args as { game_id: number; umpire_id: number };
        const resp = await client.post("/assignments", { game_id, umpire_id });
        return { content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }] };
      }

      case "list_assignments": {
        const resp = await client.get("/assignments");
        return { content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }] };
      }

      case "respond_to_assignment": {
        const { assignment_id, action } = args as { assignment_id: number; action: string };
        const resp = await client.patch(`/assignments/${assignment_id}`, { action });
        return { content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }] };
      }

      case "list_umpires": {
        const resp = await client.get("/umpires");
        return { content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }] };
      }

      case "sync_games": {
        const resp = await client.post("/games/sync");
        return { content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }] };
      }

      default:
        return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
    }
  } catch (err: any) {
    const message = err?.response?.data?.detail || err?.message || String(err);
    return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Umpire Assignment MCP Server running on stdio");
}

main().catch(console.error);
