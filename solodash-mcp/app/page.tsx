export default function Home() {
  return (
    <main style={{ fontFamily: "monospace", padding: "2rem", maxWidth: 640 }}>
      <h1>SoloDash MCP (dummy)</h1>
      <p>
        This is a dummy MCP server exposing fake SoloDash dashboard data over
        streamable HTTP at <code>/api/mcp</code>.
      </p>
      <p>Connect with:</p>
      <pre style={{ background: "#f4f4f4", padding: "1rem", overflowX: "auto" }}>
        {`claude mcp add --transport http solodash \\
  ${"https://solodash-dummy.vercel.app/api/mcp"} \\
  --header "Authorization: Bearer <TOKEN>"`}
      </pre>
      <p>
        Tools: get_dashboard_summary, list_projects, get_project_metrics,
        list_tasks, get_revenue_history
      </p>
    </main>
  );
}
