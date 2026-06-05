"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import SearchBar from "@/components/SearchBar";

const NAV = [
  { href: "/deputes",   label: "Députés" },
  { href: "/senateurs", label: "Sénateurs" },
  { href: "/scrutins",  label: "Scrutins" },
  { href: "/comparer",  label: "Comparer" },
  { href: "/archives",  label: "Archives" },
];

export default function Navbar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-border bg-card sticky top-0 z-50">
      <div className="h-[3px] bg-gradient-to-r from-[#002395] via-white to-[#ED2939]" />

      <div className="max-w-7xl mx-auto px-4 flex items-center gap-4 h-14">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1.5 shrink-0">
          <span className="font-display text-lg font-light tracking-tight">Parlement</span>
          <span className="font-display text-lg font-semibold tracking-tight text-an">Transparent</span>
        </Link>

        {/* Search — desktop */}
        <div className="hidden md:flex flex-1 max-w-md">
          <SearchBar />
        </div>

        {/* Nav — desktop */}
        <nav className="hidden md:flex items-center gap-1 shrink-0 ml-auto">
          {NAV.map(n => {
            const active = path.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href}
                className={`px-3 py-1.5 text-sm font-medium border transition-all ${
                  active ? "border-text bg-text text-bg" : "border-transparent text-muted hover:border-border hover:text-text"
                }`}>
                {n.label}
              </Link>
            );
          })}
        </nav>

        {/* Burger mobile */}
        <button className="md:hidden p-2 text-muted ml-auto" onClick={() => setOpen(!open)} aria-label="Menu">
          <span className="block w-5 h-px bg-current mb-1.5" />
          <span className="block w-5 h-px bg-current mb-1.5" />
          <span className="block w-5 h-px bg-current" />
        </button>
      </div>

      {/* Search mobile */}
      <div className="md:hidden px-4 pb-3">
        <SearchBar />
      </div>

      {/* Menu mobile */}
      {open && (
        <div className="md:hidden border-t border-border bg-card">
          {NAV.map(n => (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)}
              className="block px-4 py-3 text-sm border-b border-border last:border-0 hover:bg-bg">
              {n.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
