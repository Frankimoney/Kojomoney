
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    return NextResponse.json({
        status: 'ok',
        version: 'docker-v2-cleanup',
        timestamp: Date.now(),
        env: process.env.NODE_ENV,
        message: 'API is working'
    });
}
