import "@/app/globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import {
  personSchema,
  siteIdentity,
  siteTitle,
} from "@/lib/site-identity";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  // Every relative URL below — the canonical, the social card — resolves
  // against this. Without it Next cannot make them absolute, and a card with a
  // relative image is a card with no image.
  metadataBase: new URL(siteIdentity.url),

  title: siteTitle,
  description: siteIdentity.description,

  // One page, one canonical URL. Says so explicitly rather than leaving a
  // crawler to decide whether the address it arrived at is the real one.
  alternates: { canonical: "/" },

  authors: [{ name: siteIdentity.name, url: siteIdentity.url }],
  creator: siteIdentity.name,

  // What a link to this site unfurls into when it is pasted somewhere. The
  // image itself is `app/opengraph-image.tsx`, which Next attaches here on its
  // own — naming it a second time is how the two get to disagree.
  openGraph: {
    type: "website",
    siteName: siteIdentity.name,
    title: siteTitle,
    description: siteIdentity.description,
    url: siteIdentity.url,
    locale: "en_US",
  },

  // No `twitter.images`: with none of its own, the card falls back to the
  // Open Graph image above, which is the same picture. `summary_large_image`
  // is what makes it render as a card rather than a thumbnail beside text.
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteIdentity.description,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
        {/* Structured data. Rendered here rather than in the page because it
            describes the site's subject, which is the same on every route
            this layout wraps. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
        />
      </body>
    </html>
  );
}
