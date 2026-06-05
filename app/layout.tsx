import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: { default: "Parlement Transparent", template: "%s — Parlement Transparent" },
  description: "Accès simplifié aux votes, présences et propositions des parlementaires français.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-bg text-text font-body antialiased">
        <Navbar />
        <main>{children}</main>
        <footer className="border-t border-border mt-16 py-8 px-4">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-2 text-xs text-muted">
            <span>Parlement Transparent — Données open data AN & Sénat</span>
            <span>Assemblée Nationale · Sénat · data.gouv.fr</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
