import type { CSSProperties } from "react";
import type { Metadata } from "next";
import "./globals.css";
import { deploymentConfig } from "@/lib/deployment-config";

export const metadata: Metadata = {
  title: deploymentConfig.name,
  description: `${deploymentConfig.name} learning dashboard.`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ "--tenant-accent": deploymentConfig.primaryColor } as CSSProperties}>
      <body>{children}</body>
    </html>
  );
}
