import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  metadataBase: new URL("https://parlement-transparent.vercel.app"),
  title: { default: "Parlement Transparent — Votes et activité des députés et sénateurs", template: "%s — Parlement Transparent" },
  description: "Consultez les votes, la présence et les propositions des 577 députés et 348 sénateurs français. Assemblée Nationale et Sénat réunis, données open data mises à jour chaque nuit.",
  keywords: ["député", "sénateur", "Assemblée Nationale", "Sénat", "vote", "scrutin", "parlement français", "transparence", "open data", "France"],
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Parlement Transparent",
    title: "Parlement Transparent — Votes et activité des députés et sénateurs",
    description: "Accès simplifié aux votes, présences et propositions des parlementaires français.",
    url: "https://parlement-transparent.vercel.app",
  },
  twitter: {
    card: "summary",
    title: "Parlement Transparent",
    description: "Accès simplifié aux votes, présences et propositions des parlementaires français.",
  },
  alternates: {
    canonical: "https://parlement-transparent.vercel.app",
  },
  verification: {
    google: "NU-ZIWh17MW9jZ_Ji3z-BJClnBfnRuiwhwRUOz8-ImQ",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-bg text-text font-body antialiased">
        <Navbar />
        <main>{children}</main>
        <Analytics />
        <footer className="border-t border-border mt-16 py-8 px-4">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs text-muted">
            <div className="flex flex-col gap-1">
              <span>Parlement Transparent — Données open data AN & Sénat</span>
              <span>Assemblée Nationale · Sénat · data.gouv.fr</span>
            </div>
            <div className="flex items-center gap-4">
              <a href="#" aria-label="X / Twitter" className="hover:text-text transition-colors" target="_blank" rel="noopener noreferrer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="#" aria-label="Bluesky" className="hover:text-text transition-colors" target="_blank" rel="noopener noreferrer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 0 1-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.789.624-6.479 0-.688-.139-1.86-.902-2.203-.659-.299-1.664-.621-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8z"/></svg>
              </a>
              <a href="#" aria-label="Instagram" className="hover:text-text transition-colors" target="_blank" rel="noopener noreferrer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
              </a>
              <a href="#" aria-label="Mastodon" className="hover:text-text transition-colors" target="_blank" rel="noopener noreferrer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.268 5.313c-.35-2.578-2.617-4.61-5.304-5.004C17.51.242 15.792 0 11.813 0h-.03c-3.98 0-4.835.242-5.288.309C3.882.692 1.496 2.518.917 5.127.64 6.412.61 7.837.661 9.143c.074 1.874.088 3.745.26 5.611.118 1.24.325 2.47.62 3.68.55 2.237 2.777 4.098 4.96 4.857 2.336.792 4.849.923 7.256.38.265-.061.527-.132.786-.213.585-.184 1.27-.39 1.774-.753a.057.057 0 0 0 .023-.043v-1.809a.052.052 0 0 0-.02-.041.053.053 0 0 0-.046-.01 20.282 20.282 0 0 1-4.709.545c-2.73 0-3.463-1.284-3.674-1.818a5.593 5.593 0 0 1-.319-1.433.053.053 0 0 1 .066-.054c1.517.363 3.072.546 4.632.546.376 0 .75 0 1.125-.01 1.57-.044 3.224-.124 4.768-.422.038-.008.077-.015.11-.024 2.435-.464 4.753-1.92 4.989-5.604.008-.145.03-1.52.03-1.67.002-.512.167-3.63-.024-5.545zm-3.748 9.195h-2.561V8.29c0-1.309-.55-1.976-1.67-1.976-1.23 0-1.846.79-1.846 2.35v3.403h-2.546V8.663c0-1.56-.617-2.35-1.848-2.35-1.112 0-1.668.668-1.67 1.977v6.218H4.822V8.102c0-1.31.337-2.35 1.011-3.12.696-.77 1.608-1.164 2.74-1.164 1.311 0 2.302.504 2.962 1.51l.638 1.07.638-1.07c.66-1.006 1.65-1.51 2.96-1.51 1.13 0 2.043.395 2.74 1.164.675.77 1.012 1.81 1.012 3.12z"/></svg>
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}