import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

const manrope = Manrope({
  variable: "--font-onest",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "Shard Hunters — Idle MMORPG",
  description:
    "Idle MMORPG с авто-боем, территориями гильдий, крафтом и охотой за осколками эссенции.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Shard Hunters",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#09090b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className={`${inter.variable} ${manrope.variable} h-full antialiased`}>
      <body className="flex h-full flex-col overflow-hidden">{children}</body>
    </html>
  );
}
