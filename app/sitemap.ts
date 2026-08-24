import type { MetadataRoute } from "next";
import { siteIdentity } from "@/lib/site-identity";

// Serves `/sitemap.xml`.
//
// One entry, because the site is one page. The five sections in the Page
// Outline are anchors on that page rather than URLs of their own, and listing
// them here would claim five documents exist where there is one — a crawler
// that follows them finds the same page five times.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteIdentity.url,
      // Build time, which is the closest honest answer available: the page is
      // static, so the last time it could have changed is the last time it was
      // built.
      lastModified: new Date(),
      changeFrequency: "monthly",
    },
  ];
}
