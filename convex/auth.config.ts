/*
  Client-side auth provider manifest (safe to ship to the browser).
  See https://labs.convex.dev/auth/setup/manual
*/
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
