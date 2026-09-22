// app/layout.tsx
//
// Root layout. Wraps every page. Imports global styles and sets
// page metadata (browser tab title, description).

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Old Master",
  description: "A teacher who speaks in riddles, but means every word",
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