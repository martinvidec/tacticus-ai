import { NextResponse } from 'next/server';

// Test route to check if routing in this segment works
export async function GET(request: Request) {
  console.log("--- Test Route /api/tacticus/guildRaid/test HIT ---");
  return NextResponse.json({ message: 'Test route OK' });
} 