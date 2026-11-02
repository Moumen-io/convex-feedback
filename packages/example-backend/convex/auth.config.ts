import type { AuthConfig } from "convex/server";

const clerkIssuerDomain = process.env.CLERK_JWT_ISSUER_DOMAIN;

export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL!,
      applicationID: "convex",
    },
    ...(clerkIssuerDomain
      ? [{ domain: clerkIssuerDomain, applicationID: "convex" }]
      : []),
  ],
} satisfies AuthConfig;
