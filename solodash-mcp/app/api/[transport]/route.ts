import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

const PROJECTS = [
  {
    id: "proj_notesly",
    name: "Notesly",
    description: "AI-powered note taking app",
    platform: "iOS",
    status: "live",
    mrr: 4820,
    activeUsers: 12450,
  },
  {
    id: "proj_habitloop",
    name: "HabitLoop",
    description: "Habit tracker with streaks and widgets",
    platform: "iOS / Android",
    status: "live",
    mrr: 2310,
    activeUsers: 8730,
  },
  {
    id: "proj_shipfast",
    name: "ShipFast Board",
    description: "Kanban board for indie hackers",
    platform: "Web",
    status: "beta",
    mrr: 640,
    activeUsers: 1980,
  },
  {
    id: "proj_solodash",
    name: "SoloDash",
    description: "The dashboard you are querying right now",
    platform: "Web",
    status: "development",
    mrr: 0,
    activeUsers: 42,
  },
];

const TASKS = [
  { id: "task_1", projectId: "proj_notesly", title: "Fix iCloud sync race condition", status: "in_progress", priority: "high" },
  { id: "task_2", projectId: "proj_notesly", title: "Ship dark mode for iPad", status: "todo", priority: "medium" },
  { id: "task_3", projectId: "proj_habitloop", title: "Migrate to RevenueCat v8", status: "todo", priority: "high" },
  { id: "task_4", projectId: "proj_shipfast", title: "Add Stripe billing portal", status: "in_progress", priority: "high" },
  { id: "task_5", projectId: "proj_shipfast", title: "Write onboarding emails", status: "done", priority: "low" },
  { id: "task_6", projectId: "proj_solodash", title: "Build MCP server", status: "done", priority: "high" },
];

const REVENUE_BY_MONTH = [
  { month: "2026-02", mrr: 6120, oneTime: 340, refunds: 85 },
  { month: "2026-03", mrr: 6540, oneTime: 410, refunds: 120 },
  { month: "2026-04", mrr: 6890, oneTime: 275, refunds: 60 },
  { month: "2026-05", mrr: 7240, oneTime: 520, refunds: 95 },
  { month: "2026-06", mrr: 7610, oneTime: 480, refunds: 110 },
  { month: "2026-07", mrr: 7770, oneTime: 390, refunds: 70 },
];

function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

const handler = createMcpHandler(
  (server) => {
    server.tool(
      "get_dashboard_summary",
      "Get a high-level summary of the SoloDash dashboard: total MRR, active users, project count, and open tasks.",
      {},
      async () => {
        const totalMrr = PROJECTS.reduce((sum, p) => sum + p.mrr, 0);
        const totalUsers = PROJECTS.reduce((sum, p) => sum + p.activeUsers, 0);
        return json({
          totalMrr,
          totalActiveUsers: totalUsers,
          projectCount: PROJECTS.length,
          liveProjects: PROJECTS.filter((p) => p.status === "live").length,
          openTasks: TASKS.filter((t) => t.status !== "done").length,
          currency: "USD",
        });
      }
    );

    server.tool(
      "list_projects",
      "List all projects on the dashboard with their status, MRR, and active user counts.",
      {
        status: z.enum(["live", "beta", "development"]).optional().describe("Filter projects by status"),
      },
      async ({ status }) => {
        const projects = status ? PROJECTS.filter((p) => p.status === status) : PROJECTS;
        return json({ projects });
      }
    );

    server.tool(
      "get_project_metrics",
      "Get detailed metrics for a single project by its ID (use list_projects to find IDs).",
      {
        projectId: z.string().describe("Project ID, e.g. proj_notesly"),
      },
      async ({ projectId }) => {
        const project = PROJECTS.find((p) => p.id === projectId);
        if (!project) {
          return json({ error: `No project with id '${projectId}'. Known ids: ${PROJECTS.map((p) => p.id).join(", ")}` });
        }
        return json({
          ...project,
          metrics: {
            dau: Math.round(project.activeUsers * 0.31),
            wau: Math.round(project.activeUsers * 0.62),
            churnRatePct: project.status === "live" ? 3.4 : 7.9,
            arpu: project.activeUsers ? +(project.mrr / project.activeUsers).toFixed(2) : 0,
            crashFreeSessionsPct: 99.2,
          },
        });
      }
    );

    server.tool(
      "list_tasks",
      "List tasks across all projects, optionally filtered by status or project.",
      {
        status: z.enum(["todo", "in_progress", "done"]).optional().describe("Filter tasks by status"),
        projectId: z.string().optional().describe("Filter tasks by project ID"),
      },
      async ({ status, projectId }) => {
        let tasks = TASKS;
        if (status) tasks = tasks.filter((t) => t.status === status);
        if (projectId) tasks = tasks.filter((t) => t.projectId === projectId);
        return json({ tasks });
      }
    );

    server.tool(
      "get_revenue_history",
      "Get monthly revenue history (MRR, one-time purchases, refunds) for the last 6 months.",
      {
        months: z.number().int().min(1).max(6).optional().describe("Number of most recent months to return (default 6)"),
      },
      async ({ months }) => {
        const history = REVENUE_BY_MONTH.slice(-(months ?? 6));
        return json({ currency: "USD", history });
      }
    );
  },
  {
    serverInfo: { name: "solodash", version: "0.1.0" },
  },
  {
    basePath: "/api",
    maxDuration: 60,
    verboseLogs: true,
  }
);

function unauthorized() {
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      error: { code: -32001, message: "Unauthorized: missing or invalid bearer token" },
      id: null,
    }),
    { status: 401, headers: { "Content-Type": "application/json", "WWW-Authenticate": "Bearer" } }
  );
}

// Dummy server, dummy auth: a static bearer token, overridable via env on Vercel.
const EXPECTED_TOKEN = process.env.SOLODASH_MCP_TOKEN ?? "solodash-dummy-token";

const authedHandler = async (req: Request) => {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${EXPECTED_TOKEN}`) {
    return unauthorized();
  }
  return handler(req);
};

export { authedHandler as GET, authedHandler as POST, authedHandler as DELETE };
