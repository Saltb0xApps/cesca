import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cesca",
  description: "Notion-driven social publisher",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
