import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BottomNav from "@/app/components/BottomNav";
import ImpersonateBanner from "@/app/components/ImpersonateBanner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Catch",
  description: "Dein digitales Angelbuch",
  appleWebApp: { capable: true, title: "Catch", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-950 text-white">
        <ImpersonateBanner />
        <main className="flex-1 pb-20">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}