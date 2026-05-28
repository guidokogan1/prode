import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed, DM_Serif_Display } from "next/font/google";
import { BottomNav } from "@/components/bottom-nav";
import { SessionProvider } from "@/components/session-provider";
import "./globals.css";

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-barlow",
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-barlow-condensed",
});

const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-serif-display",
});

export const metadata: Metadata = {
  title: "Mundial Pool",
  description: "Juego mobile-first para vivir el Mundial con tus amigos.",
};

export const viewport: Viewport = {
  themeColor: "#0c1710",
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
      <body className={`${barlow.variable} ${barlowCondensed.variable} ${dmSerifDisplay.variable}`}>
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
