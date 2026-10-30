import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

// JWT verification, JWKS/OpenID discovery endpoints.
// (OAuth routes are inactive because no OAuth providers are configured.)
auth.addHttpRoutes(http);

export default http;
