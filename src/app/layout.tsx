import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/context/SessionContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Whispy",
  description: "Decentralized social network",
  icons: {
    icon: "/favicon.ico",           // favicon principal
    apple: "/apple-icon.png",       // para dispositivos Apple
    shortcut: "/favicon.ico",       // acceso directo
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* Aquí envolvemos toda la app */}
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
