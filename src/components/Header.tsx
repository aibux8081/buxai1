import React from "react";
import { Sparkles, Volume2, VolumeX, Menu, BrainCircuit, Mic, Laptop, Settings2, Code, GraduationCap, Compass, BookOpen } from "lucide-react";
import { SoundSettings } from "../types";

interface HeaderProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  soundSetting: SoundSettings;
  onToggleSound: () => void;
  systemPersona: string;
  onChangePersona: (persona: string) => void;
  activeSessionTitle: string | null;
}

export const PERSONAS = [
  {
    id: "default",
    name: "Standart Asistan",
    description: "Yazılım, eğitim ve yaratıcı yazarlık yetenekleriyle donatılmış çok yönlü genel sohbet asistanı.",
    icon: BrainCircuit,
    color: "text-cyan-700 bg-cyan-50 border border-cyan-100/60",
    systemPrompt: "Sen BUX AI olarak modern, son derece donanımlı, çok yönlü ve Türkçe konuşan uzman bir yapay zeka asistanısın. Yazılım uzmanlığı, eğitim & akademi ve yaratıcı yazarlık gibi tüm asistan profillerinin yetenekleri tek bir potada seninle birleştirilmiştir.\n\nGörüşmelerinde şu rolleri ve prensipleri benimse:\n1. Genel Danışmanlık: Kullanıcı sorularına anlaşılır, yardımcı, saygılı ve her zaman Türkçe yanıtlar ver. Detaylı cevaplarında Markdown formatını zengin ve okunaklı bir şekilde kullan.\n2. Yazılım Uzmanlığı: Kod sorularına pratik, performans odaklı çözümler ve temiz kod standartlarında refactor önerileri sun. Kod bloklarını her zaman dil etiketleriyle ver.\n3. Eğitmenlik & Akademi: Karmaşık konuları açıklarken analojiler, günlük hayattan örnekler ve adım adım eğitsel bir yaklaşım benimse. Mantığı kavramaya odaklan.\n4. Yaratıcı Yazarlık: Şiirsel, akıcı ve can alıcı edebi diller, metaforlar veya dikkat çekici metinler tasarla.\n\nCevap dili her zaman Türkçe olsun."
  }
];

export default function Header({
  soundSetting,
  onToggleSound,
  systemPersona,
  onChangePersona,
  activeSessionTitle,
}: HeaderProps) {
  return (
    <header
      id="app-header"
      className="h-16 px-8 border-b border-slate-200/80 bg-white flex items-center justify-between shrink-0 select-none text-slate-700 z-30 shadow-sm shadow-slate-100/40"
    >
      {/* Session Title Info */}
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-0.5">
            BUX SOHBET ASİSTANI
          </span>
          <span className="text-sm font-bold max-w-[280px] truncate text-slate-800 leading-none">
            {activeSessionTitle || "Seçili Sohbet Yok"}
          </span>
        </div>
        
        {/* Dynamic Online status indicator */}
        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-650 text-[9px] font-bold border border-emerald-100 flex items-center gap-1 select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          ÇEVRİMİÇİ
        </span>
      </div>

      {/* Control Actions Panel */}
      <div className="flex items-center gap-3">
        {/* Standart Asistan Badge (Static & Merged) */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-700 shadow-sm select-none">
          <div className="p-1 rounded-md text-cyan-700 bg-cyan-50 border border-cyan-100/60">
            <BrainCircuit className="w-3.5 h-3.5" strokeWidth={2.5} />
          </div>
          <span>Standart Asistan</span>
        </div>

        {/* Speak / Read Aloud Assistant Voice Feedback Toggle */}
        <button
          onClick={onToggleSound}
          className={`p-2.5 rounded-xl border transition-all duration-150 active:scale-[0.98] ${
            soundSetting === SoundSettings.BROWSER_TTS
              ? "bg-emerald-50 border-emerald-100 text-emerald-650 shadow-[0_2px_8px_rgba(16,185,129,0.1)]"
              : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 shadow-sm"
          }`}
          title={
            soundSetting === SoundSettings.BROWSER_TTS
              ? "Sesli Yanıt Açık (Metin Okuma Aktif)"
              : "Sesli Yanıt Kapalı (Dilsiz)"
          }
        >
          {soundSetting === SoundSettings.BROWSER_TTS ? (
            <div className="relative flex items-center justify-center">
              {/* Custom micro animation indicating sound lines */}
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
              </svg>
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
          ) : (
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6L11.47 3.53a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}
