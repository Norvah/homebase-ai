
import React from 'react';

const LoadingView: React.FC = () => {
  return (
    <div className="flex h-full w-full items-center justify-center bg-background-dark">
      <div className="flex flex-col items-center">
        <div className="relative flex items-center justify-center mb-8">
          <div className="absolute w-24 h-24 bg-primary/20 rounded-full animate-ping"></div>
          <div className="relative z-10 flex size-20 items-center justify-center rounded-full bg-primary shadow-[0_0_30px_rgba(242,108,13,0.4)]">
            <span className="material-symbols-outlined text-4xl text-white animate-spin">sync</span>
          </div>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">正在处理</h3>
        <p className="text-white/50">请稍候...</p>
      </div>
    </div>
  );
};

export default LoadingView;
