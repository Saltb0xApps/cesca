import type { ReactNode } from "react";

export const metadata = {
  title: "SoloDash MCP",
  description: "Dummy SoloDash MCP server over streamable HTTP",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
