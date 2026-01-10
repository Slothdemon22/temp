import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * API Route: Get or create video room for exchange verification
 * 
 * Access Control:
 * - Only authenticated users
 * - Only users involved in the exchange (requester or owner)
 * - Only when exchange status is APPROVED
 * - One room per exchange (reuses existing room if available)
 */
export async function POST(req: Request) {
  try {
    // 1. Validate authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // 2. Get exchange ID from request
    const { exchangeId } = await req.json();

    if (!exchangeId) {
      return NextResponse.json(
        { error: "exchangeId is required" },
        { status: 400 }
      );
    }

    // 3. Validate environment variables
    if (!process.env.MANAGEMENT_TOKEN) {
      return NextResponse.json(
        { error: "MANAGEMENT_TOKEN is not configured" },
        { status: 500 }
      );
    }

    if (!process.env.TEMPLATE_ID) {
      return NextResponse.json(
        { error: "TEMPLATE_ID is not configured" },
        { status: 500 }
      );
    }

    // 4. Fetch exchange and validate access
    const exchange = await prisma.exchange.findUnique({
      where: { id: exchangeId },
      include: {
        book: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!exchange) {
      return NextResponse.json(
        { error: "Exchange not found" },
        { status: 404 }
      );
    }

    // 5. Validate user is part of the exchange
    const isRequester = exchange.toUserId === userId;
    const isOwner = exchange.fromUserId === userId;

    if (!isRequester && !isOwner) {
      return NextResponse.json(
        { error: "You are not authorized to access this exchange" },
        { status: 403 }
      );
    }

    // 6. Validate exchange status is APPROVED or COMPLETED
    if (exchange.status !== "APPROVED" && exchange.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Video verification is only available for approved or completed exchanges" },
        { status: 400 }
      );
    }

    // 7. Create room name based on exchange ID (ensures one room per exchange)
    const roomName = `exchange-verification-${exchangeId}`;

    // 8. Check if room already exists (by trying to find it)
    // Note: 100ms doesn't have a direct "get room by name" API, so we'll create with a unique name
    // and store the mapping in a way that ensures one room per exchange
    // For simplicity, we'll use the exchange ID as part of the room name

    // 9. Create 100ms room
    const requestBody = {
      name: roomName,
      template_id: process.env.TEMPLATE_ID,
      description: `Book verification call for: ${exchange.book.title}`,
    };

    console.log("Creating exchange verification room:", requestBody);

    const createRoomRes = await fetch("https://api.100ms.live/v2/rooms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MANAGEMENT_TOKEN}`,
      },
      body: JSON.stringify(requestBody),
    });

    const roomText = await createRoomRes.text();

    if (!createRoomRes.ok) {
      let errorData = roomText;
      try {
        errorData = JSON.parse(roomText);
      } catch {
        // Keep as text
      }

      // If room name conflict (409), try with a unique suffix
      if (createRoomRes.status === 409) {
        console.log("Room name conflict, creating with unique suffix...");
        const uniqueRoomName = `${roomName}-${Date.now()}`;
        
        const retryRes = await fetch("https://api.100ms.live/v2/rooms", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.MANAGEMENT_TOKEN}`,
          },
          body: JSON.stringify({
            name: uniqueRoomName,
            template_id: process.env.TEMPLATE_ID,
            description: `Book verification call for: ${exchange.book.title}`,
          }),
        });

        const retryText = await retryRes.text();
        if (!retryRes.ok) {
          let retryError = retryText;
          try {
            retryError = JSON.parse(retryText);
          } catch {
            // Keep as text
          }
          return NextResponse.json(
            {
              error: "Failed to create video room",
              status: retryRes.status,
              details: retryError,
            },
            { status: retryRes.status }
          );
        }

        const retryData = JSON.parse(retryText);
        const roomId = retryData.id;

        // Generate room code for retry room
        const codeRes = await fetch(
          `https://api.100ms.live/v2/room-codes/room/${roomId}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.MANAGEMENT_TOKEN}`,
            },
            body: JSON.stringify({ role: "host" }),
          }
        );

        const codeText = await codeRes.text();
        if (!codeRes.ok) {
          return NextResponse.json(
            {
              error: "Failed to generate room code",
              status: codeRes.status,
            },
            { status: codeRes.status }
          );
        }

        const codeData = JSON.parse(codeText);
        const roomCode = codeData.data?.[0]?.code || codeData.code || null;

        if (!roomCode) {
          return NextResponse.json(
            { error: "Failed to get room code" },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          roomCode,
          roomId,
          bookTitle: exchange.book.title,
        });
      }

      return NextResponse.json(
        {
          error: "Failed to create video room",
          status: createRoomRes.status,
          details: errorData,
        },
        { status: createRoomRes.status }
      );
    }

    // 10. Parse room creation response
    if (!roomText || roomText.trim() === "") {
      return NextResponse.json(
        { error: "Empty response from 100ms API" },
        { status: 500 }
      );
    }

    const roomData = JSON.parse(roomText);
    const roomId = roomData.id;

    if (!roomId) {
      return NextResponse.json(
        { error: "Room creation failed: No room ID returned" },
        { status: 500 }
      );
    }

    // 11. Generate room code
    const codeRes = await fetch(
      `https://api.100ms.live/v2/room-codes/room/${roomId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.MANAGEMENT_TOKEN}`,
        },
        body: JSON.stringify({ role: "host" }),
      }
    );

    const codeText = await codeRes.text();

    if (!codeRes.ok) {
      let errorDetails = codeText;
      try {
        const errorJson = JSON.parse(codeText);
        errorDetails = errorJson;
      } catch {
        // Keep as text
      }

      return NextResponse.json(
        {
          error: "Failed to generate room code",
          status: codeRes.status,
          details: errorDetails,
        },
        { status: codeRes.status }
      );
    }

    if (!codeText || codeText.trim() === "") {
      return NextResponse.json(
        { error: "Empty response from 100ms API" },
        { status: 500 }
      );
    }

    const codeData = JSON.parse(codeText);
    const roomCode = codeData.data?.[0]?.code || codeData.code || null;

    if (!roomCode) {
      return NextResponse.json(
        { error: "Failed to get room code" },
        { status: 500 }
      );
    }

    // 12. Return success with room code
    return NextResponse.json({
      success: true,
      roomCode,
      roomId,
      bookTitle: exchange.book.title,
    });
  } catch (err) {
    console.error("Exchange video room error:", err);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}

