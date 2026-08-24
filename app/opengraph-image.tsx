import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { siteIdentity, siteTitle } from "@/lib/site-identity";

// The card a link to this site unfurls into. Generated at build rather than
// drawn by hand and dropped in `public/`, so it cannot keep showing a role or
// a name the site stopped using — it reads the same identity the page does.
export const alt = siteTitle;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Read off disk rather than fetched: this runs at build, when the site it
// would be fetching from is not serving yet. A missing portrait fails the
// build, which is the same bargain the rest of the configuration makes — a
// card with a hole in it is not worth shipping quietly.
const portrait = readFileSync(
  join(process.cwd(), "public", siteIdentity.portrait)
);
const portraitSrc = `data:image/jpeg;base64,${portrait.toString("base64")}`;

// The site's own colours, as literals: this is rendered by satori, which never
// sees the stylesheet the CSS custom properties live in.
const FOREGROUND = "#fafafa";
const MUTED = "#999999";
const DIM = "#666666";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          backgroundColor: "#000000",
          color: FOREGROUND,
          padding: 80,
        }}
      >
        <img
          src={portraitSrc}
          alt=""
          width={220}
          height={220}
          style={{ borderRadius: 110, objectFit: "cover", marginRight: 56 }}
        />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 68, letterSpacing: "-0.02em" }}>
            {siteIdentity.name}
          </div>
          <div style={{ fontSize: 38, color: MUTED, marginTop: 16 }}>
            {siteIdentity.role}
          </div>
          <div style={{ fontSize: 26, color: DIM, marginTop: 20 }}>
            {siteIdentity.location}
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 72,
            right: 80,
            fontSize: 24,
            color: DIM,
          }}
        >
          {siteIdentity.url.replace("https://", "")}
        </div>
      </div>
    ),
    size
  );
}
