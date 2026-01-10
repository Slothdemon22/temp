"use client";
import { useEffect, useState, useRef, Suspense } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import type { HMSPrebuiltRefType } from "@100mslive/roomkit-react";
import ErrorBoundary from "@/app/meeting/components/ErrorBoundary";

const HMSPrebuilt = dynamic(
  async () => {
    try {
      return (await import("@100mslive/roomkit-react")).HMSPrebuilt;
    } catch (error) {
      console.error("Failed to load HMSPrebuilt:", error);
      if (error instanceof Error && error.message.includes("ChunkLoadError")) {
        window.location.reload();
      }
      throw error;
    }
  },
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-lg mb-4">Loading video call...</div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        </div>
      </div>
    ),
  }
);

function ExchangeVerificationContent() {
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [chunkError, setChunkError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [bookTitle, setBookTitle] = useState<string>("the book");
  const hmsRef = useRef<HMSPrebuiltRefType>(null);
  const params = useParams();
  const router = useRouter();
  const exchangeId = params?.exchangeId as string;

  // Prevent hydration errors by only rendering client-side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle chunk loading errors globally
  useEffect(() => {
    const handleChunkError = (event: ErrorEvent) => {
      if (event.error?.message?.includes("ChunkLoadError") || event.error?.name === "ChunkLoadError") {
        console.error("ChunkLoadError detected, reloading page...");
        setChunkError("Failed to load resources. Reloading page...");
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    };

    window.addEventListener("error", handleChunkError);
    return () => window.removeEventListener("error", handleChunkError);
  }, []);

  // Fetch exchange video room
  useEffect(() => {
    if (!exchangeId || !isMounted || roomCode || isLoading) return;

    setIsLoading(true);
    setError(null);

    fetch("/api/exchange-video-room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exchangeId }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to get video room");
        }

        setBookTitle(data.bookTitle || "the book");
        setRoomCode(data.roomCode);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching exchange video room:", err);
        setError(err instanceof Error ? err.message : "Failed to start video call");
        setIsLoading(false);
      });
  }, [exchangeId, isMounted, roomCode, isLoading]);

  // Auto-enable video and audio tracks after joining
  useEffect(() => {
    if (!isJoined) return;
    
    const currentRef = hmsRef.current;
    if (!currentRef?.hmsActions || !currentRef?.hmsStore) return;

    let retryCount = 0;
    const maxRetries = 10;
    let hasLoggedWarning = false;
    let timeoutId: NodeJS.Timeout | null = null;
    let isCleanedUp = false;

    const enableTracks = async () => {
      if (isCleanedUp) return;
      
      try {
        const ref = hmsRef.current;
        if (!ref?.hmsActions || !ref?.hmsStore) {
          retryCount++;
          if (retryCount < maxRetries) {
            timeoutId = setTimeout(enableTracks, 500);
          } else if (!hasLoggedWarning) {
            hasLoggedWarning = true;
            console.warn("Max retries reached - tracks may not be available yet.");
          }
          return;
        }
        
        const { hmsActions, hmsStore } = ref;
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const storeState = hmsStore.getState((state: any) => state);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const localPeer = storeState?.hmsStates?.localPeer || storeState?.localPeer;
        
        if (!localPeer) {
          retryCount++;
          if (retryCount < maxRetries) {
            timeoutId = setTimeout(enableTracks, 500);
          } else if (!hasLoggedWarning) {
            hasLoggedWarning = true;
            console.warn("Max retries reached - tracks may not be available yet.");
          }
          return;
        }
        
        const videoTrack = localPeer.videoTrack;
        const audioTrack = localPeer.audioTrack;
        
        if (videoTrack?.id) {
          try {
            await hmsActions.setEnabledTrack(videoTrack.id, true);
            console.log("✅ Video track enabled");
          } catch (videoError) {
            console.warn("Failed to enable video:", videoError);
          }
        } else if (videoTrack) {
          try {
            await hmsActions.setEnabledTrack(videoTrack, true);
            console.log("✅ Video track enabled (alternative method)");
          } catch (videoError) {
            console.warn("Failed to enable video (alternative):", videoError);
          }
        }
        
        if (audioTrack?.id) {
          try {
            await hmsActions.setEnabledTrack(audioTrack.id, true);
            console.log("✅ Audio track enabled");
          } catch (audioError) {
            console.warn("Failed to enable audio:", audioError);
          }
        } else if (audioTrack) {
          try {
            await hmsActions.setEnabledTrack(audioTrack, true);
            console.log("✅ Audio track enabled (alternative method)");
          } catch (audioError) {
            console.warn("Failed to enable audio (alternative):", audioError);
          }
        }
        
        if (!videoTrack && !audioTrack) {
          retryCount++;
          if (retryCount < maxRetries) {
            timeoutId = setTimeout(enableTracks, 1000);
          }
        }
      } catch (error) {
        console.error("Error enabling tracks:", error);
        retryCount++;
        if (retryCount < maxRetries) {
          timeoutId = setTimeout(enableTracks, 1000);
        }
      }
    };

    timeoutId = setTimeout(enableTracks, 2000);
    
    return () => {
      isCleanedUp = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isJoined]);

  // Prevent hydration errors - only render after mount
  if (!isMounted) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center space-y-4">
          <div className="text-lg font-semibold text-gray-700">Loading...</div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (chunkError) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50" suppressHydrationWarning>
        <div className="text-center space-y-4">
          <div className="text-lg font-semibold text-red-600">{chunkError}</div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-lg font-semibold text-red-600">Error</div>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => router.push("/exchanges")}
            className="px-4 py-2 bg-orange-500 text-white rounded-full hover:bg-orange-600 transition-colors"
          >
            Back to Exchanges
          </button>
        </div>
      </div>
    );
  }

  if (!roomCode && isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50" suppressHydrationWarning>
        <div className="text-center space-y-4">
          <div className="text-lg font-semibold text-gray-700">Starting verification call...</div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!roomCode) return null;

  return (
    <>
      {/* Exchange Verification Banner */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white px-4 py-3 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📚</span>
            <p className="text-sm font-medium">
              This call is for book condition verification on <strong>{bookTitle}</strong>
            </p>
          </div>
          <button
            onClick={() => router.push("/exchanges")}
            className="text-sm underline hover:no-underline"
          >
            Back to Exchanges
          </button>
        </div>
      </div>
      
      <div style={{ height: "100vh", position: "relative", marginTop: "48px" }}>
        {/* HMSPrebuilt Component */}
        <ErrorBoundary>
          <HMSPrebuilt
            ref={hmsRef}
            roomCode={roomCode}
            onJoin={async () => {
              console.log("✅ Successfully joined the verification room!");
              setIsJoined(true);
              setIsLoading(false);
              
              setTimeout(async () => {
                const ref = hmsRef.current;
                if (ref?.hmsActions && ref?.hmsStore) {
                  try {
                    const { hmsActions, hmsStore } = ref;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const storeState = hmsStore.getState((state: any) => state);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const localPeer = storeState?.hmsStates?.localPeer || storeState?.localPeer;
                    
                    if (localPeer) {
                      const videoTrack = localPeer.videoTrack;
                      const audioTrack = localPeer.audioTrack;
                      
                      if (videoTrack?.id) {
                        try {
                          await hmsActions.setEnabledTrack(videoTrack.id, true);
                          console.log("✅ Video enabled on join");
                        } catch (e) {
                          console.warn("Video enable on join failed:", e);
                        }
                      }
                      
                      if (audioTrack?.id) {
                        try {
                          await hmsActions.setEnabledTrack(audioTrack.id, true);
                          console.log("✅ Audio enabled on join");
                        } catch (e) {
                          console.warn("Audio enable on join failed:", e);
                        }
                      }
                    }
                  } catch (error) {
                    console.warn("Failed to enable tracks on join:", error);
                  }
                }
              }, 2000);
            }}
            onLeave={() => {
              console.log("Left the verification room");
              setIsJoined(false);
              setRoomCode(null);
              router.push("/exchanges");
            }}
          />
        </ErrorBoundary>
      </div>
    </>
  );
}

export default function ExchangeVerificationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="text-center space-y-4">
            <div className="text-lg font-semibold text-gray-700">Loading...</div>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </div>
      }
    >
      <ExchangeVerificationContent />
    </Suspense>
  );
}

