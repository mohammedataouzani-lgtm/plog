import type { MetadataRoute } from "next";
import { getSitemapUids } from "@/lib/db";

const BASE = "https://parlement-transparent.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { deputes, senateurs, scrutins, archives } = await getSitemapUids();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/deputes`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/senateurs`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/scrutins`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/archives`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE}/comparer`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/recherche`, changeFrequency: "monthly", priority: 0.4 },
  ];

  const deputePages: MetadataRoute.Sitemap = deputes.map((d) => ({
    url: `${BASE}/deputes/${d.uid}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const senateurPages: MetadataRoute.Sitemap = senateurs.map((s) => ({
    url: `${BASE}/senateurs/${s.uid}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const scrutinPages: MetadataRoute.Sitemap = scrutins.map((s) => ({
    url: `${BASE}/scrutins/${s.uid}`,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const archivePages: MetadataRoute.Sitemap = archives.map((a) => ({
    url: `${BASE}/archives/${a.chambre.toLowerCase()}/${a.uid}`,
    changeFrequency: "yearly",
    priority: 0.3,
  }));

  return [...staticPages, ...deputePages, ...senateurPages, ...scrutinPages, ...archivePages];
}
