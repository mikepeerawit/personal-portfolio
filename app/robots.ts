import type { MetadataRoute } from "next";
import { siteIdentity } from "@/lib/site-identity";

// Serves `/robots.txt`. Its real job is the sitemap pointer: a crawler that
// has not been told where the sitemap is has to guess, and this site is
// otherwise linked from nowhere it can find.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The contact endpoint accepts POSTs and answers nothing useful to a
      // GET. Nothing there is secret — this keeps crawlers off a route that
      // exists to receive mail, not to be read.
      disallow: "/api/",
    },
    sitemap: `${siteIdentity.url}/sitemap.xml`,
  };
}
