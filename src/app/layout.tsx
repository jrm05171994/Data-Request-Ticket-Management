import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Koda Data Requests",
  description: "Internal ticketing system for Koda Health data requests.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
