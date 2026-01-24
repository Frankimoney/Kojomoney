
import { NextResponse } from 'next/server';



export async function GET() {
    return NextResponse.json({
        status: 'ok',
        version: 'docker-v3-syntax-fix',
        timestamp: Date.now(),
        env: process.env.NODE_ENV,
        message: 'API is working'
    });
}
