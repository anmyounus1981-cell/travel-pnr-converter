import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Travel PNR Converter",
  description: "English quotes and itineraries from GDS PNR text",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
