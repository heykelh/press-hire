import type { Metadata } from "next";
import "./studio.css";

export const metadata: Metadata = { title: "PRESS HIRE · studio", robots: { index: false, follow: false } };

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return children;
}
