
import React, { useState, useRef, useEffect } from 'react';
import { Item } from '../types';
import { smartUpdateField } from '../services/ai';
import { useI18n } from '../i18n';

interface DetailViewProps {
  item: Item;
  onBack: () => void;
  onUpdate: (item: Item) => void;
  isFromSearch?: boolean;
}

const DetailView: React.FC<DetailViewProps> = ({ item, onBack, onUpdate, isFromSearch }) => {
  const { locale, t } = useI18n();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(item.name);
  const [editedLocation, setEditedLocation] = useState(item.location);
  const [editedImageUrl, setEditedImageUrl] = useState(item.imageUrl);

  const [isRecording, setIsRecording] = useState(false);
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);
  const [recordingField, setRecordingField] = useState<'name' | 'location' | null>(null);
  const [transcript, setTranscript] = useState('');
  const [isAIProcessing, setIsAIProcessing] = useState(false);

  const recognitionRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 初始化语音识别
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

  // 相机流管理
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (isCapturingPhoto && videoRef.current) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        .then(s => {
          stream = s;
          if (videoRef.current) videoRef.current.srcObject = s;
        })
        .catch(err => {
          console.error("无法访问相机:", err);
          setIsCapturingPhoto(false);
        });
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isCapturingPhoto]);

  const startVoiceEdit = (field: 'name' | 'location') => {
    if (isAIProcessing) return;
    setRecordingField(field);
    setIsRecording(true);
    setTranscript('');
    if (recognitionRef.current) {
      try { recognitionRef.current.start(); } catch (e) { }
    }
  };

  const cancelVoiceEdit = () => {
    if (isAIProcessing) return;
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsRecording(false);
    setRecordingField(null);
    setTranscript('');
  };

  const stopVoiceEdit = async () => {
    if (recognitionRef.current) recognitionRef.current.stop();

    if (transcript.trim() && recordingField) {
      setIsAIProcessing(true);
      const currentValue = recordingField === 'name' ? editedName : editedLocation;
      try {
        const newValue = await smartUpdateField(currentValue, transcript, recordingField);
        if (recordingField === 'name') setEditedName(newValue);
        else setEditedLocation(newValue);
        // 处理成功后关闭所有状态
        setIsRecording(false);
        setRecordingField(null);
        setTranscript('');
      } catch (error) {
        console.error("AI Update failed:", error);
      } finally {
        setIsAIProcessing(false);
      }
    } else {
      setIsRecording(false);
      setRecordingField(null);
    }
  };

  const handleCapturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const context = canvasRef.current.getContext('2d');
    if (!context) return;

    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvasRef.current.toDataURL('image/jpeg');
    setEditedImageUrl(dataUrl);
    setIsCapturingPhoto(false);
  };

  const toggleRemoved = () => {
    onUpdate({ ...item, isRemoved: !item.isRemoved });
  };

  const handleSave = () => {
    onUpdate({
      ...item,
      name: editedName,
      location: editedLocation,
      imageUrl: editedImageUrl,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedName(item.name);
    setEditedLocation(item.location);
    setEditedImageUrl(item.imageUrl);
    setIsEditing(false);
  };

  // 搜索揭晓模式
  if (isFromSearch && !isEditing) {
    return (
      <div className="relative h-full w-full bg-black overflow-hidden flex flex-col">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${item.imageUrl})` }}>
          <div className="absolute inset-0 bg-black/40"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a090f] via-transparent to-[#0a090f]/50"></div>
        </div>
        <header className="relative z-10 flex items-center justify-between p-4 pt-14 px-6">
          <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white">
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <h2 className="text-white text-xl font-bold tracking-tight">{item.name}</h2>
          <div className="w-10" />
        </header>
        <div className="mt-auto relative z-10 px-8 pb-16 flex flex-col items-center">
          <div className="w-full bg-[#1c1c1e]/80 backdrop-blur-2xl rounded-[2.5rem] p-10 border border-white/10 shadow-2xl mb-10">
            <div className="flex items-center gap-3 mb-5">
              <span className="material-symbols-outlined text-primary-indigo text-xl">location_on</span>
              <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest">{t('record.aiExtract')}</span>
            </div>
            <p className="text-white text-3xl font-bold leading-tight">{item.location}</p>
          </div>
          <button onClick={onBack} className="w-full bg-primary-indigo h-14 rounded-[2.5rem] text-white font-bold text-xl shadow-[0_15px_45px_rgba(50,17,212,0.5)] active:scale-95 transition-all">{t('common.confirm')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-background-dark flex flex-col overflow-hidden">
      {/* 顶部导航 */}
      <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-4 pt-14 px-6">
        <button
          onClick={isEditing ? handleCancel : onBack}
          disabled={isAIProcessing}
          className="flex size-10 items-center justify-center rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-white active:scale-95 transition-all disabled:opacity-30"
        >
          <span className="material-symbols-outlined">{isEditing ? 'arrow_back' : 'arrow_back_ios_new'}</span>
        </button>

        {isEditing ? (
          <h2 className="text-white font-bold tracking-tight">{t('detail.voiceEdit')}</h2>
        ) : (
          <h2 className="text-white font-bold tracking-tight">{t('detail.title')}</h2>
        )}

        {isEditing ? (
          <div className="w-10"></div>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white shadow-lg active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">edit</span>
            <span className="text-xs font-bold tracking-wider">{t('common.edit')}</span>
          </button>
        )}
      </header>

      {/* 图片区域 */}
      <div className={`relative ${isEditing ? 'h-[18vh]' : 'h-[32vh]'} w-full shrink-0 overflow-hidden transition-all duration-500`}>
        <div
          className={`w-full h-full bg-center bg-no-repeat bg-cover transition-all duration-700 ${item.isRemoved ? 'grayscale brightness-50' : ''}`}
          style={{ backgroundImage: `url(${editedImageUrl})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-transparent to-transparent"></div>
        </div>

        {isEditing && (
          <div className="absolute bottom-4 right-6">
            <button
              onClick={() => setIsCapturingPhoto(true)}
              disabled={isAIProcessing}
              className="bg-black/60 backdrop-blur-md border border-white/20 px-4 py-2 rounded-full flex items-center gap-2 text-white text-[10px] font-bold active:scale-95 transition-transform disabled:opacity-30"
            >
              <span className="material-symbols-outlined text-sm">photo_camera</span>
              {t('record.retake')}
            </button>
          </div>
        )}

        {!isEditing && (
          <div className="absolute bottom-4 left-6 flex items-center gap-2">
            <div className="inline-flex items-center gap-2 bg-primary/20 backdrop-blur-md text-primary px-3 py-1 rounded-full border border-primary/30">
              <span className="material-symbols-outlined text-[14px] font-bold">verified</span>
              <span className="text-[9px] font-bold uppercase tracking-widest">{t('detail.aiRecognized')}</span>
            </div>
          </div>
        )}
      </div>

      {/* 内容区 */}
      <div className="flex-1 flex flex-col px-6 pt-2 pb-4 space-y-4 overflow-hidden">
        <section className="shrink-0">
          <label className="flex items-center justify-between text-white/40 text-[10px] font-bold mb-1.5 uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">inventory_2</span>
              {t('record.itemLabel')}
            </div>
          </label>
          {isEditing ? (
            <div className="flex gap-2">
              <input
                className="flex-1 bg-white/5 border border-white/10 rounded-xl h-12 px-4 text-base font-bold text-white outline-none focus:border-primary/50 transition-colors shadow-inner disabled:opacity-50"
                value={editedName}
                disabled={isAIProcessing}
                onChange={(e) => setEditedName(e.target.value)}
              />
              <button
                onClick={() => startVoiceEdit('name')}
                disabled={isAIProcessing}
                className={`size-12 rounded-xl bg-primary flex items-center justify-center text-white transition-all shadow-lg ${isAIProcessing ? 'opacity-20 cursor-not-allowed scale-95' : 'active:scale-90'}`}
              >
                <span className="material-symbols-outlined text-xl">mic</span>
              </button>
            </div>
          ) : (
            <h1 className="text-3xl font-bold text-white tracking-tight truncate">{item.name}</h1>
          )}
        </section>

        <section className={`${isEditing ? 'h-[22vh]' : 'flex-1'} flex flex-col min-h-0`}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2 text-primary/60 px-1">
              <span className="material-symbols-outlined text-base">location_on</span>
              <span className="text-[10px] font-bold uppercase tracking-wider">{t('record.locationLabel')}</span>
            </div>
          </div>
          <div className={`flex-1 bg-[#342418]/40 border rounded-2xl p-4 shadow-inner flex flex-col relative transition-all duration-300 ${recordingField === 'location' ? 'border-primary' : 'border-white/5'}`}>
            {isEditing ? (
              <>
                <textarea
                  className="w-full flex-1 bg-transparent border-none p-0 text-base font-bold text-white leading-relaxed outline-none focus:ring-0 resize-none disabled:opacity-50"
                  value={editedLocation}
                  disabled={isAIProcessing}
                  onChange={(e) => setEditedLocation(e.target.value)}
                  placeholder={t('list.searchPlaceholder')}
                />
                {!recordingField && (
                  <button
                    onClick={() => startVoiceEdit('location')}
                    disabled={isAIProcessing}
                    className={`absolute bottom-3 right-3 size-10 rounded-full bg-primary/20 flex items-center justify-center text-primary transition-all ${isAIProcessing ? 'opacity-10 cursor-not-allowed' : 'active:scale-90'}`}
                  >
                    <span className="material-symbols-outlined text-xl">mic</span>
                  </button>
                )}
              </>
            ) : (
              <p className="text-base text-white/90 leading-relaxed font-bold overflow-y-auto">
                {item.location}
              </p>
            )}
          </div>
        </section>

        {!isEditing && (
          <section className="shrink-0 bg-[#342418]/60 border border-white/5 rounded-2xl p-3 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className={`size-9 rounded-xl flex items-center justify-center ${item.isRemoved ? 'bg-red-500/20' : 'bg-primary/10'}`}>
                <span className={`material-symbols-outlined text-xl ${item.isRemoved ? 'text-red-500' : 'text-primary'}`}>outbox</span>
              </div>
              <div className="font-bold text-white text-sm">{t('detail.markRemoved')}</div>
            </div>
            <div
              onClick={toggleRemoved}
              className={`w-11 h-6 rounded-full transition-all duration-300 relative border flex items-center px-0.5 cursor-pointer
                ${item.isRemoved ? 'bg-primary border-primary' : 'bg-white/10 border-white/10'}
              `}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 transform ${item.isRemoved ? 'translate-x-5' : 'translate-x-0'}`}></div>
            </div>
          </section>
        )}
      </div>

      <div className="shrink-0 px-6 pb-8 pt-2 flex flex-col gap-3">
        {isEditing ? (
          <button
            onClick={handleSave}
            disabled={isAIProcessing}
            className="w-full bg-primary h-14 rounded-[2.5rem] text-white font-bold shadow-lg active:scale-[0.98] transition-all disabled:opacity-30"
          >{t('record.confirmSave')}</button>
        ) : (
          <button
            onClick={onBack}
            className="w-full h-14 rounded-[2.5rem] bg-[#342418] border border-white/10 text-white/80 font-bold flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            <span>{t('detail.backToList')}</span>
          </button>
        )}
      </div>

      {/* 语音录制面板 */}
      <div className={`absolute inset-0 z-[100] transition-opacity duration-300 ${isRecording ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={cancelVoiceEdit}></div>
        <div className={`absolute bottom-0 left-0 right-0 bg-[#0a090f] rounded-t-[3rem] px-6 pt-4 pb-12 transition-transform duration-500 ease-out transform shadow-[0_-20px_50px_rgba(0,0,0,0.5)] border-t border-white/5 ${isRecording ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="flex justify-center mb-10"><div className="w-10 h-1 bg-white/10 rounded-full"></div></div>

          <div className="flex flex-col items-center justify-center text-center relative min-h-[220px]">
            {/* AI 处理中的全覆盖覆盖层 */}
            {isAIProcessing && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0a090f]/60 backdrop-blur-xl rounded-2xl">
                <div className="relative flex items-center justify-center mb-6">
                  <div className="absolute w-20 h-20 bg-primary/20 rounded-full animate-ping"></div>
                  <div className="relative size-14 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                    <span className="material-symbols-outlined text-white animate-spin text-2xl">sync</span>
                  </div>
                </div>
                <h3 className="text-white text-lg font-bold">{t('detail.aiUpdating')}</h3>
                <p className="text-white/30 text-[10px] mt-2 tracking-widest font-bold">{t('detail.aiUpdatingDesc')}</p>
              </div>
            )}

            <div className="text-primary text-[10px] mb-3 uppercase tracking-[0.25em] font-black animate-pulse">{t('record.listening')}</div>
            <h2 className="text-white text-xl font-bold leading-tight mb-8 min-h-[40px] px-2">
              {transcript ? `“${transcript}”` : t('detail.voiceTip', { field: recordingField === 'name' ? t('record.itemLabel') : t('record.locationLabel') })}
            </h2>
            <div className="w-full flex flex-col gap-3">
              <button
                onClick={stopVoiceEdit}
                disabled={isAIProcessing}
                className="w-full bg-primary h-14 rounded-[2.5rem] text-white font-bold active:scale-95 transition-transform disabled:opacity-0"
              >{t('record.complete')}</button>
              <button
                onClick={cancelVoiceEdit}
                disabled={isAIProcessing}
                className="w-full h-14 rounded-[2.5rem] bg-white/5 text-white/80 font-bold active:scale-95 transition-transform disabled:opacity-0"
              >{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      </div>

      {/* 相机 */}
      {isCapturingPhoto && (
        <div className="absolute inset-0 z-[150] bg-black flex flex-col overflow-hidden">
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
          <button onClick={() => setIsCapturingPhoto(false)} className="absolute top-14 left-6 size-10 rounded-full bg-black/40 flex items-center justify-center text-white"><span className="material-symbols-outlined">close</span></button>
          <div className="absolute bottom-16 inset-x-0 flex justify-center"><button onClick={handleCapturePhoto} className="w-20 h-20 bg-primary rounded-full border-4 border-white/20 active:scale-95 transition-transform" /></div>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default DetailView;

