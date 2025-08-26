export type STTStatus = "idle" | "listening" | "error";

interface UseVoiceOptions {
  onFinalText?: (text: string) => void;
  onPartialText?: (text: string) => void;
}

export function useVoice(options: UseVoiceOptions = {}) {
  let recognition: any;
  const listeners: Array<() => void> = [];
  let isListening = false;
  let isSpeaking = false;

  function notify() {
    listeners.forEach((fn) => fn());
  }

  function getRecognition() {
    const SpeechRecognition =
      (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) return null;
    if (!recognition) {
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
    }
    return recognition;
  }

  function subscribe(cb: () => void) {
    listeners.push(cb);
    return () => {
      const i = listeners.indexOf(cb);
      if (i >= 0) listeners.splice(i, 1);
    };
  }

  function startListening() {
    const rec = getRecognition();
    if (!rec) return false;
    if (isListening) return true;

    rec.onresult = (event: any) => {
      let interim = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += transcript;
        else interim += transcript;
      }
      if (interim && options.onPartialText) options.onPartialText(interim);
      if (finalText && options.onFinalText) options.onFinalText(finalText.trim());
    };

    rec.onerror = () => {
      isListening = false;
      notify();
    };

    rec.onend = () => {
      isListening = false;
      notify();
    };

    rec.start();
    isListening = true;
    notify();
    return true;
  }

  function stopListening() {
    const rec = getRecognition();
    if (rec && isListening) rec.stop();
    isListening = false;
    notify();
  }

  function speak(text: string) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onstart = () => {
      isSpeaking = true;
      notify();
    };
    utterance.onend = () => {
      isSpeaking = false;
      notify();
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    window.speechSynthesis.cancel();
    isSpeaking = false;
    notify();
  }

  return {
    subscribe,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    get state() {
      return { isListening, isSpeaking };
    },
  };
}
