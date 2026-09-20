import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Juris Prudentia Admin",
  description: "Administration portal for Juris Prudentia",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
