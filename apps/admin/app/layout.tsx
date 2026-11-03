import type { Metadata } from "next";
import "./styles.css";
import { AdminGuard } from "./AdminGuard";

export const metadata: Metadata = {
  title: "Juris Prudentia Admin",
  description: "Administration portal for Juris Prudentia",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500&family=Public+Sans:wght@400;500;600;700&display=swap" />
      </head>
      <body><AdminGuard>{children}</AdminGuard></body>
    </html>
  );
}
