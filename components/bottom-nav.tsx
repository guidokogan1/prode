"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { List, Trophy, User, Zap } from "lucide-react";

const navItems = [
  { href: "/", label: "Hoy", icon: Zap },
  { href: "/matches", label: "Partidos", icon: List },
  { href: "/ranking", label: "Tabla", icon: Trophy },
  { href: "/profile", label: "Perfil", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  if (pathname === "/login" || pathname === "/register" || pathname === "/pin") {
    return null;
  }

  const links = navItems.map((item) => {
    const isActive = item.href === "/" ? pathname === item.href : pathname.startsWith(item.href);
    const Icon = item.icon;

    return (
      <Link
        key={item.href}
        href={item.href}
        className={`nav-link${isActive ? " active" : ""}`}
      >
        <span className="nav-icon" aria-hidden="true">
          <Icon size={20} strokeWidth={isActive ? 2.5 : 1.85} />
        </span>
        <span className="nav-label">{item.label}</span>
      </Link>
    );
  });

  return (
    <>
      <nav className="bottom-nav bottom-nav-mobile" aria-label="Navegacion principal">
        {links}
      </nav>
      <nav className="top-nav-desktop" aria-label="Navegacion principal">
        <div className="top-nav-brand">Mundial Pool</div>
        <div className="top-nav-links">{links}</div>
      </nav>
    </>
  );
}
