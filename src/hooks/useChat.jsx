import { createContext, useContext, useEffect, useState } from "react";

const backendUrl = "http://localhost:3000";

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const chat = async (message) => {
    setLoading(true);
    const data = await fetch(`${backendUrl}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });
    const resp = (await data.json()).messages;
    setMessages((messages) => [...messages, ...resp]);
    setLoading(false);
  };

  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState();
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [cameraZoomed, setCameraZoomed] = useState(true);
  const onMessagePlayed = () => {
    setMessages((messages) => messages.slice(1));
  };

  const startRecording = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(mediaStream);
  
      let localAudioChunks = []; 
  
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          localAudioChunks.push(event.data); 
        }
      };
  
      recorder.onstop = async () => {
        if (localAudioChunks.length === 0) {
          console.error("No audio chunks available!");
          return;
        }
  
        const audioBlob = new Blob(localAudioChunks, { type: "audio/mp3" });
        const audioFile = new File([audioBlob], "recording.mp3", { type: "audio/mp3" });
  
        const formData = new FormData();
        formData.append("audio", audioFile);
  
        try {
          const response = await fetch(`${backendUrl}/transcribe`, {
            method: "POST",
            body: formData,
          });
          const resp = (await response.json()).messages;
          setMessages((messages) => [...messages, ...resp]);
        } catch (error) {
          console.error("Error sending audio to backend:", error);
        }
  
        setLoading(false);
      };
  
      recorder.start();
      setMediaRecorder(recorder);
      setAudioChunks([]); // Clear state audioChunks
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      setMediaRecorder(null);
      setIsRecording(false);
    }
  };


  useEffect(() => {
    if (messages.length > 0) {
      setMessage(messages[0]);
    } else {
      setMessage(null);
    }
  }, [messages]);

  return (
    <ChatContext.Provider
      value={{
        chat,
        cameraZoomed,
        message,
        onMessagePlayed,
        loading,
        isRecording,
        startRecording,
        stopRecording,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};


