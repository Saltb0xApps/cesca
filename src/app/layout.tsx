import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ROT — a garden that dies the more you love it",
  description: "The only app that begs you to leave. Plant what you love. Then go.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
