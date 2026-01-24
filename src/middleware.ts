
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    // Check if the request is for the API
    if (request.nextUrl.pathname.startsWith("/api/")) {
        // Get the origin from the request headers
        const origin = request.headers.get("origin") || "";

        // Defined allowed origins
        const allowedOrigins = [
            'https://kojomoney.com',
            'https://www.kojomoney.com',
            'https://kojomoney-app.onrender.com',
            'http://localhost:3000',
            'http://localhost:3001',
            'capacitor://localhost',
            'http://localhost'
        ];

        // Determine the value for Access-Control-Allow-Origin
        // If origin is in allowed list, echo it.
        // If origin is missing (server-to-server), default to * but careful with creds.
        // Ideally if origin is null/missing, we might just allow * but set creds false?
        // But for app usage, origin is present.

        // Basic logic:
        let allowOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

        // If origin is not in allowed list but we want to be permissive for testing/unknown clients:
        // We can just echo origin if it exists, or fallback.
        // User asked to "wrapp all around allow cores".
        if (origin && !allowedOrigins.includes(origin)) {
            // allow ANY origin that hits this API (public API behavior)
            allowOrigin = origin;
        }

        // Handle preflight OPTIONS requests directly
        if (request.method === "OPTIONS") {
            return new NextResponse(null, {
                status: 200,
                headers: {
                    "Access-Control-Allow-Origin": allowOrigin,
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version, X-Request-Timestamp, X-Request-Signature, X-Device-Id",
                    "Access-Control-Allow-Credentials": "true",
                    "Content-Length": "0",
                },
            });
        }

        const response = NextResponse.next();
        response.headers.set("Access-Control-Allow-Origin", allowOrigin);
        response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
        response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version, X-Request-Timestamp, X-Request-Signature, X-Device-Id");
        response.headers.set("Access-Control-Allow-Credentials", "true");

        return response;
    }
}

export const config = {
    matcher: "/api/:path*",
};
