import type { Metadata, Viewport } from "next";
import { BottomNav } from "@/components/bottom-nav";
import { SessionProvider } from "@/components/session-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mundial Pool",
  description: "Juego mobile-first para vivir el Mundial con tus amigos.",
};

export const viewport: Viewport = {
  themeColor: "#f4f0e8",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <SessionProvider>
          <div className="app-shell">
            {children}
            <BottomNav />
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
