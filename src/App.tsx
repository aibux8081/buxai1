import React from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  setDoc,
  deleteDoc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "./firebase";
import { ChatSession, ChatMessage, SoundSettings } from "./types";
import Sidebar from "./components/Sidebar";
import Header, { PERSONAS } from "./components/Header";
import ChatBox from "./components/ChatBox";
import { Sparkles, Bot, LogIn } from "lucide-react";

export default function App() {
  const [user, setUser] = React.useState<User | null>(null);
  const [localUser, setLocalUser] = React.useState<any>(() => {
    try {
      const stored = localStorage.getItem("bux_local_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [authChecked, setAuthChecked] = React.useState(false);

  const currentUser = user || localUser;

  const handleLocalSignIn = () => {
    const mockGuest = {
      uid: "local_guest_" + Math.random().toString(36).substring(2, 11),
      displayName: "Yerel Misafir",
      email: null,
      photoURL: null,
      isLocal: true,
    };
    setLocalUser(mockGuest);
    localStorage.setItem("bux_local_user", JSON.stringify(mockGuest));
  };

  const handleLocalSignOut = () => {
    setLocalUser(null);
    localStorage.removeItem("bux_local_user");
    setSessions([]);
    setActiveSessionId(null);
    setMessages([]);
  };
  
  // App states
  const [sessions, setSessions] = React.useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  
  const [systemPersona, setSystemPersona] = React.useState<string>("default");
  const [soundSetting, setSoundSetting] = React.useState<SoundSettings>(SoundSettings.NONE);
  
  const [loadingSessions, setLoadingSessions] = React.useState(false);
  const [loadingAI, setLoadingAI] = React.useState(false);

  // Observe Authentication status change
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthChecked(true);
      
      if (!currentUser) {
        // Reset states if logged out and not in local mode
        if (!localStorage.getItem("bux_local_user")) {
          setSessions([]);
          setActiveSessionId(null);
          setMessages([]);
        }
      } else {
        // If logged in via Google/Firebase, clear any conflicting local user
        setLocalUser(null);
        localStorage.removeItem("bux_local_user");
      }
    });

    return unsubscribe;
  }, []);

  // Sync users list of conversations from Firestore or LocalStorage
  React.useEffect(() => {
    if (!currentUser) {
      setSessions([]);
      return;
    }

    if (currentUser.isLocal) {
      setLoadingSessions(true);
      try {
        const stored = localStorage.getItem("bux_local_sessions") || "[]";
        const parsed = JSON.parse(stored);
        setSessions(parsed);
        if (parsed.length > 0 && !activeSessionId) {
          setActiveSessionId(parsed[0].id);
        }
      } catch (err) {
        console.error("Local sessions parse error:", err);
      }
      setLoadingSessions(false);
      return;
    }

    setLoadingSessions(true);
    const sessionsPath = "chatSessions";
    const q = query(
      collection(db, sessionsPath),
      where("userId", "==", currentUser.uid),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: ChatSession[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          loaded.push({
            id: docSnap.id,
            userId: data.userId,
            title: data.title || "Yeni Sohbet",
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          });
        });
        setSessions(loaded);
        setLoadingSessions(false);

        // Auto selection on first load if nothing is selected and sessions exist
        if (loaded.length > 0 && !activeSessionId) {
          setActiveSessionId(loaded[0].id);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, sessionsPath);
        setLoadingSessions(false);
      }
    );

    return unsubscribe;
  }, [currentUser]);

  // Sync messages inside active selected session thread
  React.useEffect(() => {
    if (!currentUser || !activeSessionId) {
      setMessages([]);
      return;
    }

    if (currentUser.isLocal) {
      try {
        const stored = localStorage.getItem(`bux_local_messages_${activeSessionId}`) || "[]";
        setMessages(JSON.parse(stored));
      } catch (err) {
        console.error("Local messages parse error:", err);
      }
      return;
    }

    const messagesPath = `chatSessions/${activeSessionId}/messages`;
    const q = query(collection(db, messagesPath), orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: ChatMessage[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          loaded.push({
            id: docSnap.id,
            userId: data.userId,
            role: data.role,
            content: data.content,
            createdAt: data.createdAt,
          });
        });
        setMessages(loaded);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, messagesPath);
      }
    );

    return unsubscribe;
  }, [currentUser, activeSessionId]);

  // Start a new chat thread session
  const handleNewSession = async () => {
    if (!currentUser) return;

    if (currentUser.isLocal) {
      const newSessionHash = "local_session_" + Math.random().toString(36).substring(2, 11);
      const newSession: ChatSession = {
        id: newSessionHash,
        userId: currentUser.uid,
        title: "Yeni Sohbet",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updatedSessions = [newSession, ...sessions];
      setSessions(updatedSessions);
      localStorage.setItem("bux_local_sessions", JSON.stringify(updatedSessions));
      setActiveSessionId(newSessionHash);
      return;
    }

    const sessionsPath = "chatSessions";
    try {
      const newSessionRef = doc(collection(db, sessionsPath));
      const sessionData = {
        userId: currentUser.uid,
        title: "Yeni Sohbet",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(newSessionRef, sessionData);
      setActiveSessionId(newSessionRef.id);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, sessionsPath);
    }
  };

  // Submit Prompt to Gemini API and record transactions to cloud / local storage
  const handleSendMessage = async (text: string) => {
    if (!currentUser) return;

    let targetSessionId = activeSessionId;

    if (currentUser.isLocal) {
      // 1. Fast fall-through setup if no session exists, create one immediately
      if (!targetSessionId) {
        const newSessionHash = "local_session_" + Math.random().toString(36).substring(2, 11);
        const firstSessionName = text.substring(0, 32) + (text.length > 32 ? "..." : "");
        const newSession: ChatSession = {
          id: newSessionHash,
          userId: currentUser.uid,
          title: firstSessionName,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        const updatedSessions = [newSession, ...sessions];
        setSessions(updatedSessions);
        localStorage.setItem("bux_local_sessions", JSON.stringify(updatedSessions));
        targetSessionId = newSessionHash;
        setActiveSessionId(newSessionHash);
      }

      // Add user message to state and local storage immediately
      const userMessage: ChatMessage = {
        id: "msg_" + Math.random().toString(36).substring(2, 11),
        userId: currentUser.uid,
        role: "user",
        content: text,
        createdAt: new Date(),
      };

      const updatedMsgs = [...messages, userMessage];
      setMessages(updatedMsgs);
      localStorage.setItem(`bux_local_messages_${targetSessionId}`, JSON.stringify(updatedMsgs));

      // Update session title or touch updatedAt
      const updatedSessions = sessions.map((s) => {
        if (s.id === targetSessionId) {
          return {
            ...s,
            title: s.title === "Yeni Sohbet" ? text.substring(0, 40) + (text.length > 40 ? "..." : "") : s.title,
            updatedAt: new Date(),
          };
        }
        return s;
      });
      setSessions(updatedSessions);
      localStorage.setItem("bux_local_sessions", JSON.stringify(updatedSessions));

      setLoadingAI(true);
      try {
        const historySnapshot = [...updatedMsgs] as any[];
        const requestPayload = historySnapshot.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const activePersonaObj = PERSONAS.find((p) => p.id === systemPersona) || PERSONAS[0];
        const systemPrompt = activePersonaObj.systemPrompt;

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: requestPayload,
            systemPrompt,
          }),
        });

        const responseData = await response.json();
        if (!response.ok || !responseData.success) {
          throw new Error(responseData.message || "Network API dispatch failed.");
        }

        const replyText = responseData.content;

        const modelMessage: ChatMessage = {
          id: "msg_" + Math.random().toString(36).substring(2, 11),
          userId: currentUser.uid,
          role: "model",
          content: replyText,
          createdAt: new Date(),
        };

        const finalMsgs = [...updatedMsgs, modelMessage];
        setMessages(finalMsgs);
        localStorage.setItem(`bux_local_messages_${targetSessionId}`, JSON.stringify(finalMsgs));

        if (soundSetting === SoundSettings.BROWSER_TTS) {
          speakText(replyText);
        }
      } catch (error) {
        console.error("Failed local message flow:", error);
      } finally {
        setLoadingAI(false);
      }
      return;
    }

    // Default Cloud Firestore implementation
    if (!targetSessionId) {
      const sessionsPath = "chatSessions";
      try {
        const newSessionRef = doc(collection(db, sessionsPath));
        const firstSessionName = text.substring(0, 32) + (text.length > 32 ? "..." : "");
        const sessionData = {
          userId: currentUser.uid,
          title: firstSessionName,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        await setDoc(newSessionRef, sessionData);
        targetSessionId = newSessionRef.id;
        setActiveSessionId(newSessionRef.id);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, sessionsPath);
        return;
      }
    }

    const messagesPath = `chatSessions/${targetSessionId}/messages`;

    try {
      // 1. Write user prompt message to Firestore
      const userMsgRef = doc(collection(db, messagesPath));
      const userMessageData = {
        userId: currentUser.uid,
        role: "user" as const,
        content: text,
        createdAt: serverTimestamp(),
      };
      await setDoc(userMsgRef, userMessageData);

      // Action: Update Session Title if it is still named "Yeni Sohbet"
      const activeSession = sessions.find((s) => s.id === targetSessionId);
      if (activeSession && activeSession.title === "Yeni Sohbet") {
        const truncatedTitle = text.substring(0, 40) + (text.length > 40 ? "..." : "");
        const sessionRef = doc(db, "chatSessions", targetSessionId);
        await setDoc(
          sessionRef,
          { title: truncatedTitle, updatedAt: serverTimestamp() },
          { merge: true }
        );
      } else {
        // Touch updatedAt timestamp of existing session
        const sessionRef = doc(db, "chatSessions", targetSessionId);
        await setDoc(sessionRef, { updatedAt: serverTimestamp() }, { merge: true });
      }

      setLoadingAI(true);

      // Prepare conversation elements (including history and the current prompt)
      const historySnapshot = [...messages, { role: "user", content: text }] as any[];
      const requestPayload = historySnapshot.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Find system prompt configured by chosen Persona
      const activePersonaObj = PERSONAS.find((p) => p.id === systemPersona) || PERSONAS[0];
      const systemPrompt = activePersonaObj.systemPrompt;

      // 2. Query stateless Express API endpoint
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: requestPayload,
          systemPrompt,
        }),
      });

      const responseData = await response.json();

      if (!response.ok || !responseData.success) {
        throw new Error(responseData.message || "Network API dispatch failed.");
      }

      const replyText = responseData.content;

      // 3. Write Model response to Firestore
      const modelMsgRef = doc(collection(db, messagesPath));
      const modelMessageData = {
        userId: currentUser.uid,
        role: "model" as const,
        content: replyText,
        createdAt: serverTimestamp(),
      };
      await setDoc(modelMsgRef, modelMessageData);

      // Perform speech synthesized playback if option enabled
      if (soundSetting === SoundSettings.BROWSER_TTS) {
        speakText(replyText);
      }
    } catch (error) {
      console.error("Failed to execute messaging chain:", error);
    } finally {
      setLoadingAI(false);
    }
  };

  // Speaks out response in Turkish using native Web Synthesis
  const speakText = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      
      const cleaned = text
        .replace(/[*_#`\-]/g, "")
        .replace(/https?:\/\/[^\s]+/g, "")
        .substring(0, 350);

      const utterance = new SpeechSynthesisUtterance(cleaned);
      utterance.lang = "tr-TR";
      window.speechSynthesis.speak(utterance);
    }
  };

  // Delete chat session and redirect
  const handleDeleteSession = async (id: string) => {
    if (!currentUser) return;

    if (currentUser.isLocal) {
      const updatedSessions = sessions.filter((s) => s.id !== id);
      setSessions(updatedSessions);
      localStorage.setItem("bux_local_sessions", JSON.stringify(updatedSessions));
      localStorage.removeItem(`bux_local_messages_${id}`);
      if (activeSessionId === id) {
        setActiveSessionId(null);
      }
      return;
    }

    try {
      await deleteDoc(doc(db, "chatSessions", id));
      if (activeSessionId === id) {
        setActiveSessionId(null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `chatSessions/${id}`);
    }
  };

  const handleToggleSound = () => {
    if (soundSetting === SoundSettings.NONE) {
      setSoundSetting(SoundSettings.BROWSER_TTS);
    } else {
      setSoundSetting(SoundSettings.NONE);
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    }
  };

  const activeSessionTitle =
    sessions.find((s) => s.id === activeSessionId)?.title || null;

  if (!authChecked) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-950 font-sans relative">
         <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none"></div>
        <div className="space-y-4 text-center z-10">
          <div className="p-4 bg-indigo-600/10 rounded-3xl inline-block text-indigo-600 border border-indigo-500/10 shadow-[0_4px_20px_rgba(79,70,229,0.08)]">
            <Bot className="w-10 h-10 animate-bounce" />
          </div>
          <div className="space-y-1">
            <h1 className="font-bold text-lg tracking-wider uppercase text-slate-900">BUX PRO</h1>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest animate-pulse">Güvenli oturum açılıyor...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen flex overflow-hidden bg-[#fafafa] text-slate-800 font-sans select-none">
      {/* 1. Lateral Navigation / Thread Lists */}
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        loadingSessions={loadingSessions}
        currentUser={currentUser}
        onLocalSignIn={handleLocalSignIn}
        onLocalSignOut={handleLocalSignOut}
      />

      {/* 2. Chat Output Panel Container */}
      <div className="flex-1 h-full flex flex-col min-w-0 bg-slate-50">
        <Header
          onToggleSidebar={() => {}}
          isSidebarOpen={true}
          soundSetting={soundSetting}
          onToggleSound={handleToggleSound}
          systemPersona={systemPersona}
          onChangePersona={setSystemPersona}
          activeSessionTitle={activeSessionTitle}
        />

        {currentUser ? (
          <ChatBox
            messages={messages}
            loadingAI={loadingAI}
            onSendMessage={handleSendMessage}
            soundSetting={soundSetting}
          />
        ) : (
          /* Unauthenticated Landing Cover Jumbotron */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-xl mx-auto space-y-8 relative">
            <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none"></div>
            
            <div className="p-5 bg-indigo-650/10 border border-indigo-550/10 text-indigo-600 rounded-3xl shadow-[0_5px_25px_rgba(79,70,229,0.08)]">
              <Sparkles className="w-10 h-10 animate-pulse" />
            </div>
            
            <div className="space-y-3 z-10">
              <h1 className="text-2xl font-bold uppercase tracking-widest text-slate-900">
                Bux: Gelişmiş Yapay Zeka Asistanı
              </h1>
              <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
                Yüksek performanslı doğal dil işleme, Türkçe ses tanıma, akıllı hafıza ve bulut senkronizasyonu yetenekleriyle donatılmış yenilikçi yapay zeka asistanı BUX AI'ı keşfetmek için oturum açın!
              </p>
            </div>

            <div className="p-6 border border-slate-200 bg-white rounded-2xl w-full text-left space-y-4 z-10 shadow-sm animate-fade-in">
              <span className="text-[10px] font-extrabold tracking-widest uppercase text-indigo-600">YETENEKLER & ALGORİTMA</span>
              <ul className="text-xs text-slate-600 space-y-3 font-medium">
                <li className="flex items-center gap-2.5">
                  <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]"></span>
                  Gelişmiş sesli komut (mikrofon) algılama
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]"></span>
                  Metin okuma (TTS) sesli asistan yanıtları
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]"></span>
                  Sınırsız sohbet geçmişi ve bulut kayıtları
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]"></span>
                  Yazılım, eğitim ve yaratıcılık modları birleşik sistem
                </li>
              </ul>
            </div>

            {/* Google Login Iframe Solution Alert / Helper Box */}
            <div className="p-5 border border-indigo-150 bg-indigo-50/50 rounded-2xl w-full text-left space-y-3 z-10 shadow-sm">
              <div className="flex items-center gap-2 text-indigo-800 font-bold text-xs">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Google Giriş Penceresi Engelleniyor mu?</span>
              </div>
              <p className="text-xs text-slate-600 leading-normal">
                Uygulama, AI Studio önizleme ekranında (iframe içinde) çalışırken tarayıcınız güvenlik sebebiyle Google pop-up giriş penceresini engelleyebilir veya yarım bırakabilir. Google veya Misafir Girişi ile tam ve sınırsız bir senkronizasyon deneyimi elde etmek için uygulamayı yeni bir sekmede açabilirsiniz:
              </p>
              <div className="pt-1">
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all duration-150 active:scale-[0.98] shadow-md shadow-indigo-600/10 cursor-pointer"
                >
                  🚀 Uygulamayı Yeni Sekmede Aç ve Giriş Yap
                </a>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider z-10">
              Devam etmek için sol panelin altındaki giriş seçenekleriyle bir oturum başlatın.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
