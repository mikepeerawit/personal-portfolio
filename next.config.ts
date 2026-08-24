import type { NextConfig } from "next";
import { requireChallengeKey } from "./lib/challenge-config";

// Checked here because this is the only place that runs early enough to matter.
// `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is inlined into the browser bundle at build
// time, so an unset one cannot be detected at runtime by anything on the
// server: the build simply produces a page whose widget never renders, and the
// contact form is closed for as long as that deployment is live.
//
// The secret already fails this way from `lib/turnstile.ts`, which the build
// loads while collecting page data. Without the check below a deployment
// configured with only the secret builds, deploys and looks healthy.
requireChallengeKey(
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
);

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
