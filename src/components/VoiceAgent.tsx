import { useConversation } from "@elevenlabs/react";
import { useState, useCallback } from "react";
import { Mic, MicOff, Phone, PhoneOff } from "lucide-react";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "framer-motion";

const ELEVENLABS_AGENT_ID = "agent_7701k5xv4272ekwaw1d0nx7cwf3m";

export const VoiceAgent = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const conversation = useConversation({
    onConnect: () => {
      console.log("Connected to PlaySafe AI voice agent");
      setError(null);
    },
    onDisconnect: () => {
      console.log("Disconnected from voice agent");
    },
    onMessage: (message) => {
      console.log("Voice agent message:", message);
    },
    onError: (error) => {
      console.error("Voice agent error:", error);
      setError("Connection error. Please try again.");
    },
  });

  const startConversation = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Start the conversation with the public agent
      await conversation.startSession({
        agentId: ELEVENLABS_AGENT_ID,
        connectionType: "webrtc",
      });
    } catch (err) {
      console.error("Failed to start conversation:", err);
      if (err instanceof Error && err.message.includes("Permission denied")) {
        setError("Microphone access is required for voice chat.");
      } else {
        setError("Failed to connect. Please try again.");
      }
    } finally {
      setIsConnecting(false);
    }
  }, [conversation]);

  const stopConversation = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  const isConnected = conversation.status === "connected";

  return (
    <div className="fixed bottom-6 left-6 z-50">
      <AnimatePresence mode="wait">
        {!isConnected ? (
          <motion.div
            key="start"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="flex flex-col items-start gap-2"
          >
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-destructive/90 text-destructive-foreground px-3 py-2 rounded-lg text-sm max-w-[200px]"
              >
                {error}
              </motion.div>
            )}
            <Button
              onClick={startConversation}
              disabled={isConnecting}
              className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-cyan hover:from-primary/90 hover:to-cyan/90 text-primary-foreground shadow-lg shadow-primary/30 border-0"
            >
              {isConnecting ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <Phone className="w-6 h-6" />
              )}
            </Button>
            <span className="text-xs text-muted-foreground ml-1">Talk to AI</span>
          </motion.div>
        ) : (
          <motion.div
            key="active"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="flex flex-col items-center gap-3"
          >
            {/* Voice visualization */}
            <motion.div
              className="relative"
              animate={conversation.isSpeaking ? { scale: [1, 1.1, 1] } : {}}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <div className={`absolute inset-0 rounded-full ${conversation.isSpeaking ? 'bg-cyan/30 animate-ping' : 'bg-primary/20'}`} />
              <div className={`relative w-16 h-16 rounded-full flex items-center justify-center ${
                conversation.isSpeaking 
                  ? 'bg-gradient-to-br from-cyan to-primary' 
                  : 'bg-gradient-to-br from-primary to-cyan'
              }`}>
                {conversation.isSpeaking ? (
                  <Mic className="w-7 h-7 text-primary-foreground animate-pulse" />
                ) : (
                  <MicOff className="w-7 h-7 text-primary-foreground/70" />
                )}
              </div>
            </motion.div>

            {/* Status text */}
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                {conversation.isSpeaking ? "AI Speaking..." : "Listening..."}
              </p>
            </div>

            {/* End call button */}
            <Button
              onClick={stopConversation}
              variant="destructive"
              className="w-12 h-12 rounded-full"
            >
              <PhoneOff className="w-5 h-5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
