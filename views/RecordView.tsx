
import React, { useState, useRef, useEffect } from 'react';
import { ViewState, AppState } from '../types';
import { processRecording } from '../services/ai';
import { useI18n } from '../i18n';

interface RecordViewProps {
  navigate: (view: ViewState, params?: Partial<AppState>) => void;
  onCapture: (image: string, name: string, location: string) => void;
}

type RecordPhase = 'camera' | 'recording' | 'processing' | 'confirm';

const RecordView: React.FC<RecordViewProps> = ({ navigate, onCapture }) => {
  const { locale, t } = useI18n();
  const [phase, setPhase] = useState<RecordPhase>('camera');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [suggestedName, setSuggestedName] = useState('');
  const [suggestedLocation, setSuggestedLocation] = useState('');
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (phase === 'camera' && videoRef.current) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        .then(stream => {
          if (videoRef.current) videoRef.current.srcObject = stream;
        })
        .catch(err => console.error("Camera error:", err));
    }
    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, [phase]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = locale === 'zh' ? 'zh-CN' : 'en-US';

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognitionRef.current = recognition;
    }
  }, [locale]);

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const context = canvasRef.current.getContext('2d');
    if (!context) return;

    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvasRef.current.toDataURL('image/jpeg');
    setCapturedImage(dataUrl);
    setTranscript('');
    setPhase('recording');
    setErrorHint(null);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) { console.warn(e); }
    }
  };

  const resetRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) { }
    }
    setTranscript('');
    setTimeout(() => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) { console.warn(e); }
      }
    }, 100);
  };

  const stopRecordingAndProcess = async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setPhase('processing');
    setErrorHint(null);

    try {
      if (capturedImage) {
        const result = await processRecording(capturedImage, transcript || t('record.noSpeech'));
        setSuggestedName(result.name);
        setSuggestedLocation(result.location);
        setPhase('confirm');
      }
    } catch (error: any) {
      console.error("AI Analysis error:", error);
      const isRateLimit = error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED');

      setSuggestedName(t('record.unknownItem'));
      setSuggestedLocation(t('record.errorRetry'));
      setErrorHint(isRateLimit ? t('record.errorRateLimit') : t('record.errorNetwork'));
      setPhase('confirm');
    }
  };

  if (phase === 'camera') {
    return (
      <div className="relative h-full w-full bg-black overflow-hidden">
        <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />

        <header className="absolute top-14 left-6 z-10">
          <button
            onClick={() => navigate('home')}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-md border border-white/10"
          >
            <span className="material-symbols-outlined text-white">close</span>
          </button>
        </header>

        <div className="absolute top-28 left-0 right-0 flex justify-center px-8 text-center">
          <div className="bg-black/40 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10">
            <p className="text-white text-sm font-medium tracking-wide">{t('record.tip')}</p>
          </div>
        </div>

        <div className="absolute bottom-16 left-0 right-0 px-10 flex items-center justify-center">
          <div className="relative flex items-center justify-center">
            <div className="absolute w-24 h-24 rounded-full border-[3px] border-white/40"></div>
            <button
              onClick={takePhoto}
              className="relative w-[74px] h-[74px] bg-primary rounded-full shadow-2xl active:scale-90 transition-transform ring-2 ring-white/20"
            />
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'recording') {
    return (
      <div className="relative h-full w-full bg-[#0a090f] flex flex-col overflow-hidden">
        <div
          className="flex-1 bg-cover bg-center relative m-4 mb-2 rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl"
          style={{ backgroundImage: `url(${capturedImage})` }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"></div>
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
            <div className="mb-4 relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping"></div>
              <div className="relative size-14 rounded-full bg-primary flex items-center justify-center shadow-[0_0_40px_rgba(242,108,13,0.5)]">
                <span className="material-symbols-outlined text-2xl text-white fill">mic</span>
              </div>
            </div>
            <h2 className="text-white text-2xl font-bold mb-2">{t('record.describe')}</h2>
            <p className="text-white/80 text-sm leading-relaxed italic px-4">
              {transcript ? `“${transcript}”` : `“${t('record.placeholder')}”`}
            </p>
          </div>
        </div>

        <div className="px-8 pb-8 space-y-2.5">
          <button
            onClick={stopRecordingAndProcess}
            className="w-full bg-white text-black h-14 rounded-[2.5rem] font-bold text-lg flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl"
          >
            <span className="material-symbols-outlined font-bold text-xl">check_circle</span>
            {t('record.complete')}
          </button>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={resetRecording}
              className="w-full h-14 rounded-[2.5rem] text-white/80 font-bold bg-white/10 border border-white/5 active:bg-white/20 transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-xl">refresh</span>
              {t('record.retry')}
            </button>
            <button
              onClick={() => setPhase('camera')}
              className="w-full h-14 rounded-[2.5rem] text-white/40 font-bold bg-white/5 border border-white/10 active:bg-white/10 transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-xl">photo_camera</span>
              {t('record.retake')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'processing') {
    return (
      <div className="relative h-full w-full bg-background-dark flex flex-col items-center justify-center px-6">
        <div className="relative flex items-center justify-center mb-12">
          <div className="absolute w-64 h-64 bg-primary-indigo/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="relative w-48 h-48 rounded-full border border-primary-indigo/30 flex items-center justify-center bg-gradient-to-b from-primary-indigo/10 to-transparent backdrop-blur-sm overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-t from-white/20 to-transparent border-b-2 border-white/40 animate-[scan_2s_infinite_linear]"></div>
            <span className="material-symbols-outlined text-6xl text-white opacity-80">psychology</span>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <h2 className="text-white text-3xl font-bold mb-4 tracking-tight">{t('record.processing')}</h2>
          <p className="text-white/40 text-center leading-relaxed italic max-w-xs font-medium">
            {t('record.processingDesc')}
          </p>
        </div>
        <style>{`@keyframes scan { 0% { transform: translateY(-100%); } 100% { transform: translateY(200%); } }`}</style>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-background-dark flex flex-col overflow-hidden">
      <div
        className="h-[22vh] bg-cover bg-center relative shrink-0"
        style={{ backgroundImage: `url(${capturedImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-transparent to-transparent"></div>
        <div className="absolute bottom-3 left-8">
          <div className="inline-flex items-center gap-2 bg-primary/20 backdrop-blur-xl text-primary px-3 py-1.5 rounded-full border border-primary-indigo/30 shadow-lg">
            <span className="material-symbols-outlined text-xs font-bold animate-pulse">auto_awesome</span>
            <span className="text-[9px] font-bold uppercase tracking-widest">{t('record.aiExtract')}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col px-8 pt-3 space-y-3 overflow-hidden">
        <section className="shrink-0">
          <label className="flex items-center gap-2 text-white/30 text-[9px] font-bold mb-1.5 uppercase tracking-[0.15em]">
            <span className="material-symbols-outlined text-primary text-sm fill">inventory_2</span>
            {t('record.itemLabel')}
          </label>
          <input
            className="w-full bg-white/5 border border-white/10 rounded-xl h-11 px-4 text-base font-bold text-white focus:ring-1 focus:ring-primary outline-none transition-all"
            value={suggestedName}
            onChange={(e) => setSuggestedName(e.target.value)}
          />
        </section>

        <section className="flex-1 flex flex-col min-h-0">
          <label className="flex items-center gap-2 text-white/30 text-[9px] font-bold mb-1.5 uppercase tracking-[0.15em]">
            <span className="material-symbols-outlined text-primary text-sm fill">location_on</span>
            {t('record.locationLabel')}
          </label>
          <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-4 min-h-0">
            <textarea
              className="w-full h-full bg-transparent border-none p-0 text-base font-bold text-white leading-relaxed outline-none focus:ring-0 resize-none overflow-y-auto custom-scrollbar"
              value={suggestedLocation}
              onChange={(e) => setSuggestedLocation(e.target.value)}
            />
          </div>
        </section>

        {/* 动态提示区域：如果是 429 错误，显示红色提示 */}
        <div className={`rounded-xl p-2.5 flex items-start gap-3 shrink-0 transition-colors ${errorHint ? 'bg-red-500/10 border border-red-500/20' : 'bg-primary/5 border border-primary/10'}`}>
          <span className={`material-symbols-outlined text-base shrink-0 mt-0.5 ${errorHint ? 'text-red-500' : 'text-primary'}`}>
            {errorHint ? 'error_outline' : 'info'}
          </span>
          <p className={`text-[10px] leading-relaxed italic font-medium ${errorHint ? 'text-red-400' : 'text-white/40'}`}>
            {errorHint || t('record.aiSuccessTip', { transcript: transcript || "..." })}
          </p>
        </div>
      </div>

      <div className="px-8 pb-10 pt-4 flex flex-col gap-2.5 shrink-0">
        <button
          onClick={() => {
            if (capturedImage && !isSaving) {
              setIsSaving(true);
              onCapture(capturedImage, suggestedName, suggestedLocation);
            }
          }}
          disabled={isSaving}
          className={`w-full bg-primary h-14 rounded-[2.5rem] flex items-center justify-center gap-3 text-white font-bold text-lg shadow-lg transition-all ${isSaving ? 'opacity-70 cursor-not-allowed' : 'active:scale-95'}`}
        >
          {isSaving ? (
            <>
              <span className="material-symbols-outlined text-xl animate-spin">sync</span>
              <span>{t('common.saving')}</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-xl fill">save</span>
              <span>{t('record.confirmSave')}</span>
            </>
          )}
        </button>
        <button
          onClick={() => {
            if (isSaving) return;
            setTranscript('');
            setPhase('recording');
            if (recognitionRef.current) {
              try { recognitionRef.current.start(); } catch (e) { }
            }
          }}
          disabled={isSaving}
          className={`w-full h-14 rounded-[2.5rem] flex items-center justify-center gap-2 text-white/40 font-bold text-xs bg-white/5 border border-white/10 transition-colors ${isSaving ? 'opacity-30 cursor-not-allowed' : 'active:bg-white/10'}`}
        >
          <span className="material-symbols-outlined text-lg">keyboard_voice</span>
          <span>{t('record.wrongDescribe')}</span>
        </button>
      </div>

      {/* 保存中遮罩层 */}
      {isSaving && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="relative flex items-center justify-center mb-8">
            <div className="absolute w-24 h-24 bg-primary/30 rounded-full animate-ping" />
            <div className="relative w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-[0_0_40px_rgba(242,108,13,0.5)]">
              <span className="material-symbols-outlined text-3xl text-white animate-spin">sync</span>
            </div>
          </div>
          <h2 className="text-white text-2xl font-bold mb-2">{t('common.saving')}</h2>
          <p className="text-white/50 text-sm">{t('record.uploading')}</p>
        </div>
      )}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default RecordView;

