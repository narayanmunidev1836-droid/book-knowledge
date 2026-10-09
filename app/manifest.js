import { getSettings } from "@/lib/settings";

export default async function manifest() {
  const settings = await getSettings();
  return {
    name: `${settings.siteName} — ${settings.tagline || "Notes & Images for Sants"}`,
    short_name: settings.siteName || "Book Knowledge",
    description: "Platform for books, topics and image entries",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f1f5f9",
    theme_color: "#c4511f",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
