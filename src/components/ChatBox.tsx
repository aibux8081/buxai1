import React from "react";
import { Send, Mic, MicOff, Bot, Sparkles, AlertCircle, HelpCircle, ArrowDown } from "lucide-react";
import { ChatMessage, SoundSettings } from "../types";
import MarkdownRenderer from "./MarkdownRenderer";
import { motion, AnimatePresence } from "motion/react";

interface ChatBoxProps {
  messages: ChatMessage[];
  loadingAI: boolean;
  onSendMessage: (text: string) => void;
  soundSetting: SoundSettings;
}

const QUICK_PROMPTS = [
  { text: "Bana JavaScript'te asenkron fonksiyonları açıklayan sade bir eğitim ve örnek ver.", tag: "Eğitim" },
  { text: "10 satırlık, gizemli bir orman hakkında fantastik bir kış masalı yaz.", tag: "Yaratıcı" },
  { text: "Yeni başlayacak olanlar için haftalık dengeli bir spor ve beslenme programı hazırla.", tag: "Kişisel Gelişim" },
  { text: "React 19 Server Components ile Standart Components farkları nelerdir?", tag: "Kodlama" }
];

export default function ChatBox({
  messages,
  loadingAI,
  onSendMessage,
  soundSetting,
}: ChatBoxProps) {
  const [inputText, setInputText] = React.useState("");
  const [isListening, setIsListening] = React.useState(false);
  const [autoSend, setAutoSend] = React.useState(false);
  const [micError, setMicError] = React.useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = React.useState(true);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const recognitionRef = React.useRef<any>(null);

  // Auto-scroll logic
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, loadingAI]);

  // Handle Speech Recognition Setup
  React.useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "tr-TR"; // Set to Turkish locale

      rec.onstart = () => {
        setIsListening(true);
        setMicError(null);
      };

      rec.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event.error);
        if (event.error === "not-allowed") {
          setMicError("Mikrofon izni reddedildi. Lütfen tarayıcı izinlerini açın.");
        } else {
          setMicError(`Ses tanımlanamadı: ${event.error}`);
        }
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onresult = (event: any) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setInputText((prev) => {
            const separator = prev.endsWith(" ") || !prev ? "" : " ";
            const updated = prev + separator + finalTranscript;
            return updated;
          });
        }
      };

      recognitionRef.current = rec;
    } catch (e) {
      console.error("Failed to construct SpeechRecognition instance:", e);
      setSpeechSupported(false);
    }

    // Cleanup speech engine
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, []);

  const handleMicToggle = () => {
    if (!speechSupported) {
      setMicError("Tarayıcınız ses tanıma özelliğini desteklemiyor.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setInputText(""); // Clear previous input to start fresh recording session
      setMicError(null);
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.error("Error starting speech recognition:", err);
      }
    }
  };

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || loadingAI) return;

    // Stop listening if sending
    if (isListening) {
      recognitionRef.current?.stop();
    }

    onSendMessage(text);
    setInputText("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-hidden select-text relative">
      {/* Background Ambient Glow */}
      <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Thread Content Area */}
      <div className="flex-1 overflow-y-auto px-6 md:px-10 py-8 space-y-6 scrollbar-thin z-10">
        {messages.length === 0 ? (
          /* Empty Active Session State Page / Setup Guides */
          <div className="max-w-2xl mx-auto pt-12 pb-16 text-center text-slate-800 font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="inline-block p-4 bg-indigo-50 border border-indigo-100 rounded-3xl text-indigo-650 mb-2 shadow-sm">
                <Bot className="w-12 h-12 text-indigo-600 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900 uppercase">
                  Akıllı Asistan Dünyasına Hoş Geldiniz!
                </h2>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  İster yazın, ister mikrofon simgesine dokunarak sesinizle talimat verin. Sohbetiniz otomatik olarak asistanın yerel tarayıcı hafızasına kaydedilir.
                </p>
              </div>

              {/* Suggestions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-left mt-8">
                {QUICK_PROMPTS.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInputText(p.text)}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-indigo-500/30 transition-all duration-200 shadow-sm cursor-pointer"
                  >
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase bg-indigo-50 text-indigo-600 border border-indigo-100 mb-2.5">
                      {p.tag}
                    </span>
                    <p className="text-xs text-slate-650 font-semibold line-clamp-2 leading-relaxed">
                      {p.text}
                    </p>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-8 font-sans">
            {messages.map((message) => {
              const isUser = message.role === "user";
              return (
                <div
                  key={message.id}
                  className={`flex ${isUser ? "justify-end" : "justify-start"} items-start gap-4`}
                >
                  {/* Assistant Robot Avatar column in left side */}
                  {!isUser && (
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-605 to-indigo-500 flex items-center justify-center shadow-md shadow-indigo-200/50 shrink-0 select-none">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                  )}

                  {/* Bubble content */}
                  <div className={`max-w-[85%] md:max-w-[78%] rounded-2xl p-5 border shadow-sm ${
                    isUser
                      ? "bg-indigo-600 border-indigo-700 text-white rounded-tr-none shadow-indigo-100/50"
                      : "bg-white border-slate-205 text-slate-800 rounded-tl-none"
                  }`}>
                    {!isUser && (
                      <div className="flex items-center gap-2 mb-2 select-none border-b border-slate-100 pb-1.5 font-sans">
                        <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">AI ASİSTAN</span>
                        <span className="text-[9px] text-slate-400 font-semibold italic">Hatırlama Modu Etkin</span>
                      </div>
                    )}
                    
                    {isUser ? (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                    ) : (
                      <MarkdownRenderer content={message.content} />
                    )}
                    
                    {/* Timestamp signature */}
                    <div className={`text-[9px] mt-2.5 font-mono tracking-wide ${
                      isUser ? "text-indigo-200 text-right" : "text-slate-450"
                    }`}>
                      {message.createdAt?.toDate 
                        ? message.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* AI Assistant Typist Loader */}
            {loadingAI && (
              <div className="flex justify-start items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-505 flex items-center justify-center shadow-md shrink-0 animate-bounce select-none">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-4 max-w-[85%] sm:w-64 shadow-sm">
                  <div className="flex items-center gap-1.5 py-1">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce duration-300" style={{ animationDelay: "0ms" }}></span>
                    <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce duration-300" style={{ animationDelay: "150ms" }}></span>
                    <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce duration-300" style={{ animationDelay: "300ms" }}></span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Asistan düşünüyor...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Trapped Error Alert Notification banner */}
      {micError && (
        <div className="mx-8 my-2 p-3.5 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 flex items-center gap-2 z-10 shadow-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{micError}</span>
        </div>
      )}

      {/* Voice feedback waves pulsing capsule */}
      {isListening && (
        <div className="mx-8 my-2 p-4 bg-white border border-red-100 rounded-xl flex flex-col md:flex-row items-center justify-between gap-3 animate-in fade-in duration-200 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <span className="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-red-400 opacity-75"></span>
              <div className="p-2 bg-red-500 text-white rounded-full relative">
                <Mic className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 leading-none uppercase tracking-wide">Ses Karakteri Algılanıyor</p>
              <p className="text-[10px] text-slate-500 mt-1 font-semibold">Lütfen Türkçe konuşun, asistan sesinizi kayda dönüştürüyor...</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Audio wave simple vertical bar animation */}
            <div className="flex items-end gap-1 h-5 select-none shrink-0">
              <span className="w-1 bg-indigo-500 rounded-sm animate-[pulse_1s_infinite_100ms] h-4"></span>
              <span className="w-1 bg-cyan-500 rounded-sm animate-[pulse_1.2s_infinite_200ms] h-2"></span>
              <span className="w-1 bg-indigo-400 rounded-sm animate-[pulse_0.8s_infinite_300ms] h-5"></span>
              <span className="w-1 bg-cyan-400 rounded-sm animate-[pulse_1.1s_infinite_400ms] h-3"></span>
              <span className="w-1 bg-indigo-500 rounded-sm animate-[pulse_0.9s_infinite_500ms] h-4"></span>
            </div>

            <button
              onClick={() => {
                recognitionRef.current?.stop();
              }}
              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-bold rounded-lg border border-red-150 transition-all duration-150"
            >
              Durdur
            </button>
          </div>
        </div>
      )}

      {/* Message Composition / Input bar column */}
      <div className="p-8 bg-slate-50 shrink-0 z-10 border-t border-slate-205 shadow-sm">
        <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-2xl p-2.5 flex items-center gap-3 focus-within:ring-2 focus-within:ring-indigo-500/30 shadow-lg transition-all duration-150">
          
          {/* Microphone activation button */}
          <button
            onClick={handleMicToggle}
            type="button"
            className={`p-3.5 rounded-xl shrink-0 transition-all duration-150 relative active:scale-[0.95] ${
              isListening
                ? "bg-red-50 border border-red-200 text-red-550 hover:bg-red-100 shadow-[0_2px_8px_rgba(239,68,68,0.1)]"
                : "bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-500"
            }`}
            title={isListening ? "Ses Kaydını Kapat" : "Sesli Komut / Mikrofon Modunu Aç"}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Prompt typing textarea container */}
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={
              isListening
                ? "Sizi dinliyorum, konuşun..."
                : "Bir mesaj yazın veya sesli komut verin..."
            }
            rows={1}
            className="flex-1 w-full max-h-32 min-h-[44px] py-2 px-2 resize-none bg-transparent outline-none border-0 text-sm placeholder:text-slate-400 text-slate-800 scrollbar-thin font-sans"
            style={{ height: "auto" }}
          />

          {/* Send prompt Button */}
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || loadingAI}
            type="button"
            className="p-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl shrink-0 shadow-sm active:scale-[0.95] transition-all duration-150"
            title="Mesajı Gönder"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Informative Footer Credits */}
        <div className="max-w-4xl mx-auto text-center mt-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          SOHBETLERİNİZ UÇTAN UCA ŞİFRELENİR VE GÜVENLE BULUTTA SAKLANIR
        </div>
      </div>
    </div>
  );
}
