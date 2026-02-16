import { NextResponse } from 'next/server';
import type { GuildRaidResponse } from '@/lib/types';
import { ApiKeyBodySchema, validateParams } from '@/lib/validation';

const TACTICUS_SERVER_URL = process.env.TACTICUS_SERVER_URL;

export async function POST(request: Request) {
    console.log("[API Validate] Received validation request.");

    if (!TACTICUS_SERVER_URL) {
        console.error('[API Validate] TACTICUS_SERVER_URL is not configured.');
        return NextResponse.json({ success: false, error: 'Server configuration error.' }, { status: 500 });
    }

    let apiKey: string;
    try {
        const body = await request.json();
        const validation = validateParams(ApiKeyBodySchema, body);
        if (!validation.success) {
            return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
        }
        apiKey = validation.data.apiKey;
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 });
    }

    // Use a known recent season for testing. Alternatively, could try '/player' endpoint if it's simpler
    // and guaranteed to work with just the key. Let's stick to guildRaid for consistency.
    const testSeason = '72'; // Adjust if needed
    const targetUrl = `${TACTICUS_SERVER_URL}guildRaid/${testSeason}`;
    console.log(`[API Validate] Testing key against: ${targetUrl}`);

    try {
        const response = await fetch(targetUrl, {
            headers: {
                'X-API-KEY': apiKey, // Use the provided key directly
                'Accept': 'application/json',
            },
        });

        console.log(`[API Validate] Tacticus API response status: ${response.status}`);

        if (response.status === 403) {
            console.log("[API Validate] Validation failed: 403 Forbidden (Invalid Key).");
            return NextResponse.json({ success: false, error: 'Invalid API Key provided.' }, { status: 403 });
        }

        if (!response.ok) {
             let errorMsg = `Tacticus API error: Status ${response.status}`;
             try {
                 const errorData = await response.json();
                 errorMsg = `Tacticus API error: ${errorData.type || errorMsg}`;
             } catch {}
             console.warn("[API Validate] Validation failed:", errorMsg);
             // Return a generic error for non-403 issues during validation
             return NextResponse.json({ success: false, error: 'Failed to validate key with Tacticus API.' }, { status: response.status });
        }

        // Key is valid, try to parse and extract ID
        const responseBodyText = await response.text();
        let data: GuildRaidResponse | null = null;
        try {
             data = JSON.parse(responseBodyText);
        } catch (parseError) {
            console.error('[API Validate] Error parsing Tacticus response:', parseError);
            // Key is valid, but response parsing failed. Proceed without ID.
             return NextResponse.json({ success: true, tacticusUserId: null, warning: 'Key validated, but failed to parse response.' });
        }

        if (data && data.entries && data.entries.length > 0 && data.entries[0].userId) {
            const extractedId = data.entries[0].userId;
            console.log("[API Validate] Key validated successfully. Extracted Tacticus ID:", extractedId);
            return NextResponse.json({ success: true, tacticusUserId: extractedId });
        } else {
            console.warn("[API Validate] Key validated successfully, but no entries found or missing userId in first entry.");
            // Key is valid, but we couldn't extract the ID from this endpoint/season
            return NextResponse.json({ success: true, tacticusUserId: null });
        }

    } catch (error) {
        console.error("[API Validate] Network error during validation fetch:", error);
        return NextResponse.json({ success: false, error: 'Network error during key validation.' }, { status: 504 }); // Gateway Timeout
    }
} 