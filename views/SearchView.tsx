
import React, { useState, useEffect, useRef } from 'react';
import { Item, ViewState, AppState } from '../types';
import { findItems } from '../services/ai';

interface SearchViewProps {
  items: Item[];
  navigate: (view: ViewState, params?: Partial<AppState>) => void;
}

type SearchPhase = 'listening' | 'matching' | 'results' | 'too_many_results' | 'reveal' | 'no_results';

const SearchView: React.FC<SearchViewProps> = ({ items, navigate }) => {
  const [phase, setPhase] = useState<SearchPhase>('listening');
  const [transcript, setTranscript] = useState('');
  const [results, setResults] = useState<Item[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [errorHint, setErrorHint] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef('');
  const isWaitingForSearchRef = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'zh-CN';

      recognitionRef.current.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
        transcriptRef.current = currentTranscript;

        if (isWaitingForSearchRef.current && currentTranscript.trim()) {
          isWaitingForSearchRef.current = false;
          performSearch(currentTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('语音识别错误', event.error);
        setIsRecording(false);
        isWaitingForSearchRef.current = false;
      };

      recognitionRef.current.onend = () => {
        if (isWaitingForSearchRef.current && transcriptRef.current.trim()) {
          isWaitingForSearchRef.current = false;
          performSearch(transcriptRef.current);
        }
      };
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const center = container.scrollLeft + container.offsetWidth / 2;

    let closestIndex = 0;
    let minDistance = Infinity;

    const cards = container.querySelectorAll('.search-card');
    cards.forEach((card: any, index: number) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const distance = Math.abs(center - cardCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    if (closestIndex !== activeIndex) {
      setActiveIndex(closestIndex);
    }
  };

  const handleVoiceStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setTranscript('');
    transcriptRef.current = '';
    isWaitingForSearchRef.current = false;
    setIsRecording(true);
    setErrorHint(null);
    try {
      recognitionRef.current?.start();
    } catch (e) {
      console.warn(e);
    }
  };

  const handleVoiceEnd = () => {
    if (!isRecording) return;
    setIsRecording(false);
    isWaitingForSearchRef.current = true;
    recognitionRef.current?.stop();

    const currentQuery = transcriptRef.current;
    if (currentQuery.trim()) {
      isWaitingForSearchRef.current = false;
      performSearch(currentQuery);
    } else {
      setTimeout(() => {
        if (isWaitingForSearchRef.current) {
          isWaitingForSearchRef.current = false;
        }
      }, 1500);
    }
  };

  const performSearch = async (query: string) => {
    if (!query.trim()) return;
    setPhase('matching');
    setErrorHint(null);
    try {
      const matchedIds = await findItems(query, items);
      const matchedItems = items.filter(item => matchedIds.includes(item.id));

      if (matchedItems.length === 0) {
        setPhase('no_results');
      } else if (matchedItems.length === 1) {
        setResults(matchedItems);
        setPhase('reveal');
      } else if (matchedItems.length > 4) {
        setResults(matchedItems);
        setPhase('too_many_results');
      } else {
        setResults(matchedItems);
        setActiveIndex(0);
        setPhase('results');
        setTimeout(() => {
          if (scrollContainerRef.current) scrollContainerRef.current.scrollLeft = 0;
        }, 100);
      }
    } catch (err: any) {
      console.error(err);
      const isRateLimit = err?.message?.includes('429') || err?.message?.includes('RESOURCE_EXHAUSTED');
      setErrorHint(isRateLimit ? "AI 线路忙 (429)，请稍后再试" : "分析服务出现一点状况");
      setPhase('no_results');
    }
  };

  const handleChipClick = (chip: string) => {
    const newQuery = `${transcript} ${chip}`;
    setTranscript(newQuery);
    transcriptRef.current = newQuery;
    performSearch(newQuery);
  };

  if (phase === 'listening') {
    return (
      <div className="relative h-full w-full bg-[#0a090f] overflow-hidden flex flex-col">
        <header className="flex items-center p-4 pt-14 justify-between">
          <button onClick={() => navigate('home')} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10">
            <span className="material-symbols-outlined text-white text-xl">close</span>
          </button>
          <span className="text-white/40 text-[10px] font-bold tracking-[0.2em] uppercase">AI 智能寻物</span>
          <div className="w-10" />
        </header>

        <div className="flex-1 flex flex-col items-center justify-center px-10">
          <div className="mb-14 relative">
            <div className="absolute inset-0 bg-primary-indigo/30 blur-3xl rounded-full"></div>
            <div className="relative w-24 h-24 bg-primary-indigo rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(50,17,212,0.4)]">
              <span className="material-symbols-outlined text-4xl text-white">grid_view</span>
            </div>
          </div>

          <h1 className="text-white text-4xl font-bold text-center mb-6 h-20 overflow-hidden leading-tight">
            {transcript || "找什么？"}
          </h1>
          <p className="text-white/30 text-sm text-center font-medium">请按住说出物品名称或位置描述</p>

          <div className="mt-20 flex items-center justify-center gap-1.5 h-10">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className={`w-1.5 bg-primary-indigo rounded-full transition-all duration-300 ${isRecording ? 'animate-[voice-wave_0.5s_infinite_ease-in-out]' : 'h-1.5 opacity-20'}`} style={{ animationDelay: `${i * 0.06}s` }}></div>
            ))}
          </div>
        </div>

        <div className="p-8 pb-16">
          <button
            onMouseDown={handleVoiceStart}
            onMouseUp={handleVoiceEnd}
            onMouseLeave={handleVoiceEnd}
            onTouchStart={handleVoiceStart}
            onTouchEnd={handleVoiceEnd}
            className={`w-full h-16 rounded-[2.5rem] flex items-center justify-center gap-4 text-white font-bold text-lg transition-all ${isRecording ? 'bg-primary-indigo scale-95 shadow-none' : 'bg-primary-indigo shadow-[0_15px_45px_rgba(50,17,212,0.3)] active:scale-[0.98]'}`}
          >
            <span className="material-symbols-outlined text-3xl">{isRecording ? 'mic' : 'mic_none'}</span>
            <span>{isRecording ? '松开即匹配' : '按住说话'}</span>
          </button>
        </div>
        <style>{`@keyframes voice-wave { 0%, 100% { height: 6px; } 50% { height: 32px; } }`}</style>
      </div>
    );
  }

  if (phase === 'too_many_results') {
    return (
      <div className="relative h-full w-full bg-[#0a090f] flex flex-col overflow-hidden px-8">
        <header className="flex items-center justify-between pt-14 mb-8 shrink-0">
          <button onClick={() => setPhase('listening')} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10">
            <span className="material-symbols-outlined text-white text-xl">close</span>
          </button>
          <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest">AI 智能寻物</span>
          <div className="w-10" />
        </header>

        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-primary-indigo/30 blur-2xl rounded-full"></div>
            <div className="relative size-20 rounded-full bg-primary-indigo flex items-center justify-center shadow-[0_0_50px_rgba(50,17,212,0.4)]">
              <span className="material-symbols-outlined text-white text-3xl">grid_view</span>
            </div>
          </div>

          <h2 className="text-white text-2xl font-bold mb-4 tracking-tight leading-snug px-4">
            找到了很多相关的物品，<br />请问您找的是哪一个？
          </h2>

          <p className="text-white/40 text-xs font-medium mb-8">您可以尝试缩小范围</p>

          <div className="flex flex-wrap justify-center gap-3 mb-10 max-w-sm">
            <button onClick={() => handleChipClick('在卧室的')} className="bg-primary-indigo/20 border border-primary-indigo/30 px-5 py-3 rounded-xl flex items-center gap-2 text-white/90 text-sm font-bold active:scale-95 transition-transform">
              <span className="material-symbols-outlined text-primary-indigo text-lg">bedroom_parent</span>
              <span>在卧室的</span>
            </button>
            <button onClick={() => handleChipClick('最近存入的')} className="bg-primary-indigo/20 border border-primary-indigo/30 px-5 py-3 rounded-xl flex items-center gap-2 text-white/90 text-sm font-bold active:scale-95 transition-transform">
              <span className="material-symbols-outlined text-primary-indigo text-lg">schedule</span>
              <span>最近存入的</span>
            </button>
            <button onClick={() => handleChipClick('文件类的')} className="bg-primary-indigo/20 border border-primary-indigo/30 px-5 py-3 rounded-xl flex items-center gap-2 text-white/90 text-sm font-bold active:scale-95 transition-transform">
              <span className="material-symbols-outlined text-primary-indigo text-lg">description</span>
              <span>文件类的</span>
            </button>
          </div>

          <div className="flex items-center justify-center gap-1 h-8 mb-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className={`w-1 bg-primary-indigo rounded-full transition-all duration-300 ${isRecording ? 'animate-[voice-wave_0.5s_infinite_ease-in-out]' : 'h-1 opacity-20'}`} style={{ animationDelay: `${i * 0.06}s` }}></div>
            ))}
          </div>
          <p className="text-white/40 text-xs font-medium italic">“卧室里的蓝色文件夹”</p>
        </div>

        <div className="pb-14 pt-4 shrink-0 flex flex-col items-center">
          <button
            onMouseDown={handleVoiceStart}
            onMouseUp={handleVoiceEnd}
            onMouseLeave={handleVoiceEnd}
            onTouchStart={handleVoiceStart}
            onTouchEnd={handleVoiceEnd}
            className={`w-60 h-24 rounded-[3.5rem] flex items-center justify-center gap-4 text-white font-bold transition-all mx-auto ${isRecording ? 'bg-primary-indigo scale-95' : 'bg-primary-indigo shadow-[0_15px_45px_rgba(50,17,212,0.4)] active:scale-[0.98]'}`}
          >
            <span className="material-symbols-outlined text-4xl">{isRecording ? 'mic' : 'mic_none'}</span>
            <span className="text-xl">按住说话</span>
          </button>
          <p className="text-white/20 text-[9px] text-center mt-6 font-bold tracking-[0.2em] uppercase">AI 正在聆听您的详细描述</p>
        </div>
        <style>{`@keyframes voice-wave { 0%, 100% { height: 4px; } 50% { height: 24px; } }`}</style>
      </div>
    );
  }

  if (phase === 'results') {
    return (
      <div className="relative h-full w-full bg-[#0a090f] flex flex-col overflow-hidden">
        <header className="flex items-center p-4 pt-14 justify-between relative z-10 shrink-0">
          <button onClick={() => setPhase('listening')} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10">
            <span className="material-symbols-outlined text-white">chevron_left</span>
          </button>
          <h2 className="text-white text-sm font-bold tracking-widest uppercase opacity-60">搜索结果</h2>
          <div className="w-10" />
        </header>

        <div className="px-8 mt-4 text-center relative z-10 shrink-0">
          <h3 className="text-white text-2xl font-bold tracking-tight mb-0.5">
            为您找到了 {results.length} 件相关物品
          </h3>
          <p className="text-white/30 text-[10px] font-bold tracking-[0.2em] italic uppercase">“{transcript}”</p>
        </div>

        <div className="flex-1 relative flex flex-col justify-center overflow-hidden min-h-0 py-2">
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="w-full h-full flex items-center overflow-x-auto snap-x snap-mandatory no-scrollbar px-[calc(50%-150px)] gap-5"
          >
            {results.map((item, idx) => {
              const isActive = idx === activeIndex;
              return (
                <div
                  key={item.id}
                  className={`search-card snap-center shrink-0 w-[300px] h-[95%] max-h-[500px] rounded-[3.5rem] overflow-hidden bg-[#121214] border transition-all duration-500 transform flex flex-col
                    ${isActive
                      ? 'scale-100 opacity-100 border-primary-indigo shadow-[0_0_80px_rgba(50,17,212,0.3)] z-20'
                      : 'scale-[0.82] opacity-25 grayscale blur-[1px] border-white/5 z-10'}`}
                  onClick={() => {
                    if (isActive) {
                      navigate('detail', { currentItemId: item.id, isFromSearch: true });
                    } else {
                      scrollContainerRef.current?.scrollTo({
                        left: idx * (300 + 20),
                        behavior: 'smooth'
                      });
                    }
                  }}
                >
                  <div className="flex-1 w-full relative min-h-0 overflow-hidden">
                    <img src={item.imageUrl} className="w-full h-full object-cover" alt={item.name} />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#121214] via-transparent to-transparent"></div>
                  </div>

                  <div className={`px-8 transition-all duration-500 overflow-hidden flex flex-col justify-center ${isActive ? 'h-[160px] pb-10 pt-2' : 'h-[80px] pb-8'}`}>
                    <div className="flex items-center gap-2.5 mb-2 shrink-0">
                      <div className="size-6 rounded-full bg-primary-indigo/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary-indigo text-lg fill">stars</span>
                      </div>
                      <h4 className="text-white font-bold text-2xl truncate tracking-tight">{item.name}</h4>
                    </div>

                    <div className={`flex items-start gap-2 px-1 transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
                      <span className="material-symbols-outlined text-[16px] text-white/20 mt-0.5">location_on</span>
                      <p className="text-white/40 text-xs font-medium leading-tight line-clamp-2">
                        {item.location}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-2.5 mt-4 justify-center shrink-0">
            {results.map((_, idx) => (
              <div key={idx} className={`h-1 rounded-full transition-all duration-300 ${idx === activeIndex ? 'w-10 bg-primary-indigo' : 'w-2 bg-white/10'}`}></div>
            ))}
          </div>
        </div>

        <div className="p-8 pb-12 flex flex-col gap-4 relative z-10 shrink-0">
          <button
            onClick={() => navigate('detail', { currentItemId: results[activeIndex].id, isFromSearch: true })}
            className="w-full bg-primary-indigo h-16 rounded-[2rem] flex items-center justify-center gap-4 text-white font-bold text-lg shadow-[0_15px_45px_rgba(50,17,212,0.3)] active:scale-[0.98] transition-all"
          >
            <span className="material-symbols-outlined text-2xl fill">check_circle</span>
            <span>这就是我要找的</span>
          </button>

          <button
            onClick={() => setPhase('listening')}
            className="w-full h-12 rounded-[2rem] flex items-center justify-center gap-3 text-white/40 font-bold text-sm bg-white/5 border border-white/5 active:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-xl">keyboard_voice</span>
            <span>描述不对？重新说一下</span>
          </button>
        </div>
        <style>{`.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
      </div>
    );
  }

  if (phase === 'reveal') {
    const item = results[0];
    return (
      <div className="relative h-full w-full bg-black overflow-hidden flex flex-col">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${item.imageUrl})` }}>
          <div className="absolute inset-0 bg-black/40"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a090f] via-transparent to-[#0a090f]/50"></div>
        </div>

        <header className="relative z-10 flex items-center justify-between p-4 pt-14 px-6">
          <button onClick={() => setPhase('listening')} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white">
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <h2 className="text-white text-xl font-bold tracking-tight">{item.name}</h2>
          <div className="w-10" />
        </header>

        <div className="mt-auto relative z-10 px-8 pb-16 flex flex-col items-center">
          <div className="w-full bg-[#1c1c1e]/80 backdrop-blur-2xl rounded-[2.5rem] p-10 border border-white/10 shadow-2xl mb-8">
            <div className="flex items-center gap-3 mb-5">
              <span className="material-symbols-outlined text-primary-indigo text-xl">location_on</span>
              <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest">AI 识别位置</span>
            </div>
            <p className="text-white text-3xl font-bold leading-tight">{item.location}</p>
          </div>

          <button
            onClick={() => navigate('home')}
            className="w-full bg-primary-indigo h-16 rounded-[2.5rem] text-white font-bold text-xl shadow-[0_15px_45px_rgba(50,17,212,0.5)] active:scale-95 transition-all"
          >
            知道了
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'matching') {
    return (
      <div className="relative h-full w-full bg-[#0a090f] flex flex-col items-center justify-center px-6">
        <div className="relative flex items-center justify-center mb-12">
          <div className="absolute w-64 h-64 bg-primary-indigo/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="relative w-40 h-40 rounded-full border border-primary-indigo/30 flex items-center justify-center bg-primary-indigo/10 backdrop-blur-sm overflow-hidden">
            <span className="material-symbols-outlined text-5xl text-white animate-bounce">search</span>
          </div>
        </div>
        <h2 className="text-white text-2xl font-bold mb-4 tracking-tight">正在深度匹配...</h2>
        <p className="text-white/40 text-center max-w-xs leading-relaxed italic font-medium">“{transcript}”</p>
      </div>
    );
  }

  if (phase === 'no_results') {
    return (
      <div className="relative h-full w-full bg-[#0a090f] flex flex-col overflow-hidden px-8">
        <header className="flex items-center justify-between pt-14 mb-16">
          <button onClick={() => setPhase('listening')} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10">
            <span className="material-symbols-outlined text-white">close</span>
          </button>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="size-24 bg-white/5 rounded-full flex items-center justify-center mb-10 border border-white/10 text-white/20">
            <span className="material-symbols-outlined text-5xl">search_off</span>
          </div>
          <h2 className="text-white text-3xl font-bold mb-4 tracking-tight">
            {errorHint ? "遇到了一点阻碍" : "抱歉，没能找到它"}
          </h2>
          <p className="text-white/40 text-base leading-relaxed max-w-xs font-medium italic">
            {errorHint || `“${transcript}”`}
          </p>
          {!errorHint && <p className="text-white/20 text-xs mt-4">建议换个说法，比如描述物品颜色或周围环境</p>}
        </div>
        <div className="pb-16">
          <button onClick={() => setPhase('listening')} className="w-full bg-primary-indigo h-16 rounded-[2.5rem] text-white font-bold active:scale-[0.98] transition-transform">
            {errorHint ? "重试一次" : "重新描述"}
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default SearchView;
