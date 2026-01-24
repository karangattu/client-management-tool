import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth-context";
import { LanguageProvider } from "@/lib/language-context";
import { Toaster } from "@/components/ui/toaster";
import { CommandMenu } from "@/components/layout/CommandMenu";
import { AutoLogout } from "@/components/layout/AutoLogout";
import { ServiceWorkerInit } from "@/components/ServiceWorkerInit";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: 'swap',
});

export const metadata: Metadata = {
  title: "ClientHub - Client Management System",
  description: "A comprehensive client intake and management system for case managers, social workers, and service providers.",
  keywords: ["client management", "intake form", "case management", "social services"],
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased`}
      >
        <ServiceWorkerInit />
        <LanguageProvider>
          <AuthProvider>
            <TooltipProvider>
              {children}
              <Toaster />
              <CommandMenu />
              <AutoLogout />
            </TooltipProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
