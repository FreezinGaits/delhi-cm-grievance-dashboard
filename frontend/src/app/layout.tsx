import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Delhi CM Grievance Dashboard — Governance Intelligence Platform",
  description: "AI-powered grievance management and governance intelligence platform for the Chief Minister's Office of Delhi. Real-time complaint tracking, field visit mode, and department performance analytics.",
  keywords: "Delhi, CM, grievance, dashboard, governance, complaint, tracking, analytics",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
