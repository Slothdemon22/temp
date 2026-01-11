"use client";
import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import type { HMSPrebuiltRefType } from "@100mslive/roomkit-react";
import RoomLanding from "./components/RoomLanding";
import ErrorBoundary from "./components/ErrorBoundary";

const HMSPrebuilt = dynamic(
  async () => {
    try {
      return (await import("@100mslive/roomkit-react")).HMSPrebuilt;
    } catch (error) {
      console.error("Failed to load HMSPrebuilt:", error);
      // Retry loading the chunk
      if (error instanceof Error && error.message.includes("ChunkLoadError")) {
        window.location.reload();
      }
      throw error;
    }
  },
  { 
    ssr: false, // ✅ stops SSR issues
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

function MeetingPageContent() {
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [chunkError, setChunkError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const hmsRef = useRef<HMSPrebuiltRefType>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Prevent hydration errors by only rendering client-side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle chunk loading errors and getComputedStyle errors globally
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const errorMessage = event.error?.message || event.message || "";
      
      // Handle chunk loading errors
      if (errorMessage.includes("ChunkLoadError") || event.error?.name === "ChunkLoadError") {
        console.error("ChunkLoadError detected, reloading page...");
        setChunkError("Failed to load resources. Reloading page...");
        setTimeout(() => {
          window.location.reload();
        }, 2000);
        return;
      }
      
      // Handle getComputedStyle errors - redirect to home gracefully
      if (errorMessage.includes("getComputedStyle") || errorMessage.includes("not of type 'Element'")) {
        console.warn("DOM access error detected, redirecting to home:", errorMessage);
        event.preventDefault(); // Prevent error from showing
        setTimeout(() => {
          try {
            router.push("/");
          } catch {
            window.location.href = "/";
          }
        }, 100);
        return;
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const errorMessage = event.reason?.message || String(event.reason) || "";
      
      // Handle getComputedStyle errors in promise rejections
      if (errorMessage.includes("getComputedStyle") || errorMessage.includes("not of type 'Element'")) {
        console.warn("Unhandled promise rejection with DOM error, redirecting to home:", errorMessage);
        event.preventDefault(); // Prevent error from showing
        setTimeout(() => {
          try {
            router.push("/");
          } catch {
            window.location.href = "/";
          }
        }, 100);
      }
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, [router]);

  const joinRoom = useCallback(async (roomId?: string, shouldCreate: boolean = false) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const urlRoomId = roomId || searchParams.get("room");
      let targetRoomId: string;

      if (urlRoomId) {
        // Check if room exists first
        console.log("Checking if room exists:", urlRoomId);
        const checkRes = await fetch("/api/check-room", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room_id: urlRoomId }),
        });

        if (!checkRes.ok) {
          const errorData = await checkRes.json().catch(() => ({}));
          throw new Error(
            `Failed to check room: ${checkRes.statusText}. ${JSON.stringify(errorData)}`
          );
        }

        const checkData = await checkRes.json();
        
        if (!checkData.exists) {
          throw new Error("Room does not exist. Please create a new room or use a valid room ID.");
        }

        console.log("Room exists, joining:", urlRoomId);
        targetRoomId = urlRoomId;
      } else if (shouldCreate) {
        // Only create room if user explicitly requested it
        console.log("Creating new room...");
        const roomRes = await fetch("/api/get-or-create-room", { method: "POST" });
        if (!roomRes.ok) {
          const errorData = await roomRes.json().catch(() => ({}));
          throw new Error(
            `Failed to create room: ${roomRes.statusText}. ${JSON.stringify(errorData)}`
          );
        }

        const roomData = await roomRes.json();
        if (!roomData.id) {
          throw new Error("Room creation failed: No room ID returned");
        }

        targetRoomId = roomData.id;
        // Update URL with new room ID
        router.push(`/meeting?room=${targetRoomId}`);
      } else {
        // No room ID and not creating - show landing page
        setIsLoading(false);
        return;
      }

      // Generate room code - everyone joins as host role
      const role = "host"; // Always use host role for all users
      console.log(`🔑 Joining room ${targetRoomId} as role: ${role}`);
      
      // Add delay to avoid hitting API too frequently
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const codeRes = await fetch("/api/generate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room_id: targetRoomId, role: "host" }), // Explicitly use "host"
      });

      if (!codeRes.ok) {
        const errorData = await codeRes.json().catch(() => ({}));
        throw new Error(
          `Failed to generate code: ${codeRes.statusText}. ${JSON.stringify(errorData)}`
        );
      }

      const codeData = await codeRes.json();
      let code: string | null = null;
      
      if (codeData.data?.[0]?.code) {
        code = codeData.data[0].code;
      } else if (codeData.code) {
        code = codeData.code;
      } else if (typeof codeData === "string") {
        code = codeData;
      }

      if (!code) {
        throw new Error("Code generation failed: No code returned in response");
      }

      setRoomCode(code);
      setIsLoading(false);
    } catch (err) {
      console.error("Error joining room:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setIsLoading(false);
    }
  }, [searchParams, router]);

  // Auto-join if room ID is in URL (only if room exists)
  useEffect(() => {
    const urlRoomId = searchParams.get("room");
    
    if (urlRoomId && !roomCode && !isLoading && isMounted) {
      // Don't create room automatically, just try to join existing one
      joinRoom(urlRoomId, false);
    }
  }, [searchParams, roomCode, isLoading, isMounted, joinRoom]);


  // Cleanup on unmount to prevent DOM access errors
  useEffect(() => {
    return () => {
      // Cleanup function to prevent getComputedStyle errors
      try {
        setIsJoined(false);
        setRoomCode(null);
      } catch (error) {
        console.warn("Cleanup error (non-critical):", error);
      }
    };
  }, []);

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
            console.warn("Max retries reached - tracks may not be available yet. This is normal if camera/mic permissions are pending.");
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
            console.warn("Max retries reached - tracks may not be available yet. This is normal if camera/mic permissions are pending.");
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

  const handleCreateRoom = () => {
    // Explicitly create a new room
    joinRoom(undefined, true);
  };

  const handleJoinRoom = (roomId: string) => {
    // Join existing room (don't create)
    router.push(`/meeting?room=${roomId}`);
    joinRoom(roomId, false);
  };


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

  // Show landing page if no room code and not loading from URL
  if (!roomCode && !searchParams.get("room")) {
    return (
      <>
        <RoomLanding onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} />
        {error && (
          <div className="fixed bottom-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50" suppressHydrationWarning>
            {error}
          </div>
        )}
      </>
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

  if (!roomCode && isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50" suppressHydrationWarning>
        <div className="text-center space-y-4">
          <div className="text-lg font-semibold text-gray-700">Joining meeting...</div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!roomCode) return null;

  return (
    <>
      <div style={{ height: "100vh", position: "relative" }}>
        {/* HMSPrebuilt Component */}
        <ErrorBoundary>
          <HMSPrebuilt
            ref={hmsRef}
            roomCode={roomCode}
          onJoin={async () => {
            console.log("✅ Successfully joined the room!");
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
            try {
              console.log("Left the room");
              setIsJoined(false);
              setRoomCode(null);
              
              // Add small delay to allow cleanup before navigation
              setTimeout(() => {
                try {
                  router.push("/");
                } catch (navError) {
                  console.warn("Router navigation failed, using window.location:", navError);
                  // Fallback to window.location if router fails
                  window.location.href = "/";
                }
              }, 100);
            } catch (error) {
              console.error("Error in onLeave handler:", error);
              // Ensure navigation happens even if there's an error
              setTimeout(() => {
                window.location.href = "/";
              }, 100);
            }
          }}
          />
        </ErrorBoundary>
      </div>
    </>
  );
}

export default function MeetingPage() {
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
      <MeetingPageContent />
    </Suspense>
  );
}

