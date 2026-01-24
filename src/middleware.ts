
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    // Check if the request is for the API
    if (request.nextUrl.pathname.startsWith("/api/")) {
        // Get the origin from the request headers
        const origin = request.headers.get("origin") || "*";

        // Handle preflight OPTIONS requests directly
        if (request.method === "OPTIONS") {
            return new NextResponse(null, {
                status: 200,
                headers: {
                    "Access-Control-Allow-Origin": origin,
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version",
                    "Access-Control-Allow-Credentials": "true",
                    "Content-Length": "0",
                },
            });
        }

        // For other requests, pass through but we can attach headers involved in the response 
        // typically referencing the next.config.js headers OR modifying response here.
        // Ideally, we let the request continue, and headers are applied by next.config.js 
        // OR we intercept the response.

        // However, for maximum robustness against "No Access-Control-Allow-Origin", 
        // we can manage it here. But modifying the *Response* in middleware is trickier for non-OPTIONS in Next.js 
        // without returning it immediately.

        // Strategy: Let OPTIONS be handled here (which is the main blocker for Preflight).
        // The actual GET/POST response headers should be handled by next.config.js headers() config 
        // which effectively wraps the final response.

        // But if requests fail (500), next.config.js headers MIGHT NOT be applied.
        // The previous deployment failure (502) was the root cause.

        const response = NextResponse.next();
        response.headers.set("Access-Control-Allow-Origin", origin);
        response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
        response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version");
        response.headers.set("Access-Control-Allow-Credentials", "true");

        return response;
    }
}

export const config = {
    matcher: "/api/:path*",
};
