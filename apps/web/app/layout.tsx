import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./title.css";
import "./game.css";

export const metadata: Metadata = {
  title: "PRESS HIRE",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0b1e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
