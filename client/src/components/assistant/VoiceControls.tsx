import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useVoice } from "@/hooks/use-voice";

interface Props {
  onUserFinalUtterance: (text: string) => Promise<string>;
}

export const VoiceControls = ({ onUserFinalUtterance }: Props) => {
  const [, setTick] = useState(0);
  const voice = useVoice({
    onFinalText: async (text) => {
      if (!text) return;
      const answer = await onUserFinalUtterance(text);
      voice.speak(answer);
    },
  });

  useEffect(() => voice.subscribe(() => setTick((t) => t + 1)), []);
  const { isListening, isSpeaking } = voice.state;

  return (
    <div className="flex items-center gap-3">
      <Button onClick={() => voice.startListening()} disabled={isListening}>
        {isListening ? "Listening…" : "Start Talking"}
      </Button>
      <Button variant="secondary" onClick={() => voice.stopListening()} disabled={!isListening}>
        Stop Talking
      </Button>
      <Button variant="ghost" onClick={() => voice.stopSpeaking()} disabled={!isSpeaking}>
        Stop Voice
      </Button>
    </div>
  );
};
