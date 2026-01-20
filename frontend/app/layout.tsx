import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google"; // Switch to JetBrains Mono
import "./globals.css";

// Only loading JetBrains Mono, as per aesthetic requirements
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap", // Ensure text is visible immediately
});

export const metadata: Metadata = {
  title: "REPRO_ | IMPLEMENT RESEARCH",
  description: "MASTER MACHINE LEARNING BY IMPLEMENTING PAPERS. LEETCODE STYLE.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${jetbrainsMono.variable} antialiased bg-grid min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
