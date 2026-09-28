import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { AuthListener } from "@/components/auth-listener";
import { Nav } from "@/components/nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SkillSwap",
  description: "Find students who can help, and offer skills of your own.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <AuthListener />
        <Suspense fallback={<div className="h-16 border-b border-rose-100 bg-white" />}>
          <Nav />
        </Suspense>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-24 md:pb-10">{children}</main>
      </body>
    </html>
  );
}
