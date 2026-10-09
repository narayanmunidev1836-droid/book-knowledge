import { Geist, Geist_Mono } from "next/font/google";
import { getSettings } from "@/lib/settings";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata() {
  const settings = await getSettings();
  return {
    title: `${settings.siteName} — ${settings.tagline || "Notes & Images for Sants"}`,
    description: "Platform for books, topics and image entries",
    icons: {
      icon: [
        { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
        { url: "/icon.svg?v=3", type: "image/svg+xml" },
        { url: "/favicon.ico?v=3", sizes: "any" },
      ],
      apple: "/apple-icon.png?v=3",
    },
  };
}

export const viewport = {
  themeColor: "#c4511f",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
