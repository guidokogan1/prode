import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import { BottomNav } from "@/components/bottom-nav";
import { DemoFloatingBar } from "@/components/demo-floating-bar";
import { SessionProvider } from "@/components/session-provider";
import { SyncRetry } from "@/components/sync-retry";
import { getActiveDemoPersonaSlug } from "@/lib/demo-state";
import { getDemoPersonas } from "@/lib/mock-data";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow-condensed",
});

export const metadata: Metadata = {
  title: "LPF",
  description: "Juego mobile-first para vivir la LPF con tus amigos.",
  manifest: "/manifest.webmanifest",
  robots: { index: false, follow: false },
  icons: {
    icon: [
      { url: "/icon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.ico"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0c1710",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const showDemoBar = process.env.NEXT_PUBLIC_ENABLE_DEMO === "1";

  return (
    <html lang="es" className={`${inter.variable} ${barlowCondensed.variable}`}>
      <body>
        <SessionProvider>
          <SyncRetry />
          <div className="app-shell">
            {children}
            <BottomNav />
          </div>
          {showDemoBar ? <DemoBar /> : null}
        </SessionProvider>
      </body>
    </html>
  );
}

async function DemoBar() {
  const [activePersona, personas] = await Promise.all([
    getActiveDemoPersonaSlug(),
    Promise.resolve(getDemoPersonas()),
  ]);
  return <DemoFloatingBar activePersona={activePersona} personas={personas} />;
}
