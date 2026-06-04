import React from "react";
import { MessageSquare, Plus, Trash2, LogIn, LogOut, User, Sparkles, Languages } from "lucide-react";
import { auth, db } from "../firebase";
import { GoogleAuthProvider, signInWithPopup, signInAnonymously, signOut } from "firebase/auth";
import { ChatSession } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  loadingSessions: boolean;
  currentUser: any;
  onLocalSignIn: () => void;
  onLocalSignOut: () => void;
}

export default function Sidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  loadingSessions,
  currentUser,
  onLocalSignIn,
  onLocalSignOut,
}: SidebarProps) {
  const [authLoading, setAuthLoading] = React.useState(false);
  const [authError, setAuthError] = React.useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setAuthError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Google login failed:", err);
      if (err?.code === "auth/popup-closed-by-user") {
        setAuthError(
          "Giriş ekranı kapatıldı veya tarayıcı tarafından engellendi. Lütfen 'Misafir Girişi' butonunu kullanın ya da uygulamayı yeni sekmede açarak Google ile giriş yapın."
        );
      } else {
        setAuthError(
          "Google girişi başarısız oldu (Iframe kısıtlamalarından kaynaklanabilir). Kusursuz bir deneyim için lütfen 'Misafir Girişi' seçeneğini kullanın."
        );
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await signInAnonymously(auth);
    } catch (err: any) {
      console.error("Guest login failed:", err);
      if (err?.code === "auth/admin-restricted-operation" || (err?.message && err.message.includes("admin-restricted-operation"))) {
        setAuthError(
          "Asistan yerel tarayıcı hafızasında başlatıldı. Artık dilediğiniz gibi sohbet edebilirsiniz (bulut yedekleme hariç)."
        );
        onLocalSignIn();
      } else {
        setAuthError("Misafir girişi başarısız oldu. Lütfen internet bağlantınızı kontrol edin.");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      if (currentUser?.isLocal) {
        onLocalSignOut();
      } else {
        await signOut(auth);
      }
    } catch (err) {
      console.error("Sign out failed:", err);
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <aside
      id="app-sidebar"
      className="w-80 h-full border-r border-slate-200/80 bg-white flex flex-col select-none text-slate-700"
    >
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-200/60 flex items-center justify-between bg-slate-50/80">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 shadow-[0_2px_8px_rgba(79,70,229,0.06)] animate-pulse">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm leading-tight tracking-tight text-slate-900 uppercase">
              BUX
            </h1>
            <span className="text-[10px] text-slate-400 font-semibold tracking-wide">
              Hafıza & Ses Entegrasyonlu
            </span>
          </div>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="p-4 bg-white">
        <button
          id="btn-new-chat"
          onClick={onNewSession}
          disabled={!currentUser}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-all duration-200 active:scale-[0.98] disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200/50 disabled:cursor-not-allowed shadow-[0_4px_12px_rgba(79,70,229,0.12)]"
        >
          <Plus className="w-4 h-4 text-white" />
          Yeni Sohbet Başlat
        </button>
      </div>

      {/* Conversation Thread History List */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1 scrollbar-thin">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-2">
          Geçmiş Kayıtlar
        </div>

        {!currentUser ? (
          <div className="p-5 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50 flex flex-col items-center">
            <MessageSquare className="w-8 h-8 mx-auto text-slate-400 mb-2" />
            <p className="text-xs text-slate-500 mb-2 leading-relaxed">
              Sohbetlerinizi kaydetmek ve asistanı kullanmak için lütfen oturum açın.
            </p>
          </div>
        ) : loadingSessions ? (
          <div className="space-y-2 p-3 text-center text-xs text-slate-400">
            <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-indigo-500 border-t-transparent mb-1"></div>
            <p>Sohbetler yükleniyor...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-400">
            Aktif sohbet bulunmuyor. Yeni bir sohbet başlatmak için yukarıdaki butona tıklayın!
          </div>
        ) : (
          <div className="space-y-1.5">
            <AnimatePresence initial={false}>
              {sessions.map((session) => {
                const isActive = activeSessionId === session.id;
                return (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                    className={`group relative flex items-center justify-between rounded-xl p-3.5 text-xs font-semibold transition-all duration-150 cursor-pointer ${
                      isActive
                        ? "bg-indigo-50 border border-indigo-100/50 text-indigo-950"
                        : "hover:bg-slate-50 text-slate-600 border border-transparent"
                    }`}
                    onClick={() => onSelectSession(session.id)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0 pr-6">
                      <div className={`w-2 h-2 rounded-full shrink-0 transition-all duration-300 ${
                        isActive 
                          ? "bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]" 
                          : "bg-slate-300"
                      }`} />
                      <span className="truncate">
                        {session.title || "Yeni Sohbet"}
                      </span>
                    </div>

                    {/* Delete action indicator button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSession(session.id);
                      }}
                      className="absolute right-3 opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-slate-100 transition-all duration-150"
                      title="Sohbeti Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* User Login state footer */}
      <div className="p-5 border-t border-slate-200/80 bg-slate-50/50">
        {currentUser ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  referrerPolicy="no-referrer"
                  alt={currentUser.displayName || "Profil Resmi"}
                  className="w-10 h-10 rounded-full border border-slate-200 shadow-sm ring-2 ring-slate-100"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold ring-2 ring-slate-100">
                  {currentUser.displayName?.[0]?.toUpperCase() || <User className="w-5 h-5" />}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate leading-none text-slate-900">
                  {currentUser.displayName || "Misafir Kullanıcı"}
                </p>
                <p className="text-[10px] text-slate-500 truncate mt-1 font-medium">
                  {currentUser.email || (currentUser.isLocal ? "Yerel Tarayıcı Oturumu" : "Anonim Oturum")}
                </p>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              disabled={authLoading}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200/60 rounded-xl transition-all duration-150 active:scale-[0.98] disabled:opacity-50"
            >
              <LogOut className="w-3.5 h-3.5" />
              Oturumu Kapat
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-slate-400 mb-2 font-medium">
              Geçmiş sohbetleri kaydetmek için giriş yapın:
            </p>
            {authError && (
              <div className="p-3 text-[10px] text-amber-800 bg-amber-50 border border-amber-200/60 rounded-xl leading-normal text-left">
                {authError}
              </div>
            )}
            <button
              onClick={handleGoogleSignIn}
              disabled={authLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-slate-700 border border-slate-200/80 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-all duration-150 active:scale-[0.98] shadow-sm"
            >
              {/* Google SVG */}
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" width="24" height="24">
                <path
                  fill="#EA4335"
                  d="M12.24 10.285V14.4h6.887C18.2 16.634 15.633 18 12.24 18c-3.866 0-7-3.134-7-7s3.134-7 7-7c1.83 0 3.488.7 4.742 1.84l3.125-3.125C18.156 1.01 15.353 0 12.24 0 5.48 0 0 5.48 0 12.24s5.48 12.24 12.24 12.24c6.8 0 11.76-4.76 11.76-11.76 0-.784-.08-1.54-.224-2.435H12.24z"
                />
              </svg>
              Google Girişi
            </button>

            <button
              onClick={handleGuestSignIn}
              disabled={authLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-500/10 rounded-xl text-xs font-semibold transition-all duration-150 active:scale-[0.98] shadow-md shadow-indigo-500/5"
            >
              <User className="w-3.5 h-3.5" />
              Misafir Girişi
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
