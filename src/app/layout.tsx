import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import SessionProvider from "@/components/SessionProvider";

export const metadata: Metadata = {
  title: "Lock In Tracker",
  description: "Track your daily goals and stay locked in.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
        <Toaster theme="dark" position="top-right" richColors />
      </body>
    </html>
  );
}
