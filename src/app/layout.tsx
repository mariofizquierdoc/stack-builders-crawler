import type { Metadata } from "next";
import "./globals.css";
import UserBar from "@/components/UserBar";

export const metadata: Metadata = {
  title: "HN Crawler",
  description: "Hacker News top 30 stories crawler",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-100 min-h-screen">
        <UserBar />
        {children}
      </body>
    </html>
  );
}
