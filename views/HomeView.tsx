
import React from 'react';
import { ViewState, AppState } from '../types';
import { useI18n } from '../i18n';
import LanguageSwitcher from '../components/LanguageSwitcher';

interface HomeViewProps {
  navigate: (view: ViewState, params?: Partial<AppState>) => void;
  itemCount: number;
  onSignOut?: () => void;
  onShowAuth?: () => void;
}

const HomeView: React.FC<HomeViewProps> = ({ navigate, itemCount, onSignOut, onShowAuth }) => {
  const { t } = useI18n();

  return (
    <div className="relative flex flex-col h-full px-6 pt-16 pb-12">
      <header className="mb-10 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">{t('app.name')}</h1>
          <p className="text-white/50 text-sm mt-1">{t('app.slogan')}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* 语言切换按钮 */}
          <LanguageSwitcher variant="icon" />

          {/* 匿名用户显示登录按钮，正式用户显示登出按钮 */}
          {onShowAuth ? (
            <button
              onClick={onShowAuth}
              className="h-9 px-4 rounded-full bg-primary/20 backdrop-blur-md flex items-center justify-center gap-1.5 border border-primary/30 active:scale-95 transition-transform"
              title={t('auth.login')}
            >
              <span className="material-symbols-outlined text-lg text-primary">login</span>
              <span className="text-primary text-xs font-bold">{t('auth.login')}</span>
            </button>
          ) : onSignOut ? (
            <button
              onClick={onSignOut}
              className="w-10 h-10 rounded-full bg-white/5 backdrop-blur-md flex items-center justify-center border border-white/10 active:scale-95 transition-transform"
              title={t('settings.logout')}
            >
              <span className="material-symbols-outlined text-xl text-white">logout</span>
            </button>
          ) : null}
        </div>
      </header>

      <div className="flex-1 flex flex-col gap-6">
        {/* Record Card */}
        <div
          onClick={() => navigate('record')}
          className="flex-1 bg-primary rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden active:scale-[0.98] transition-all cursor-pointer shadow-2xl group"
        >
          <div className="absolute -right-8 -top-8 opacity-20 group-hover:scale-110 transition-transform duration-500">
            <span className="material-symbols-outlined text-[160px] text-white">photo_camera</span>
          </div>
          <div className="relative z-10">
            <span className="material-symbols-outlined text-4xl mb-4 block text-white fill">add_circle</span>
            <h2 className="text-3xl font-bold text-white">{t('home.record')}</h2>
            <p className="text-white/80 text-sm mt-2 max-w-[180px]">{t('home.recordDesc')}</p>
          </div>
          <div className="relative z-10 self-end">
            <div className="bg-white/20 px-4 py-2 rounded-full flex items-center gap-2 backdrop-blur-sm border border-white/10">
              <span className="text-sm font-semibold text-white">{t('home.startRecord')}</span>
              <span className="material-symbols-outlined text-sm text-white">arrow_forward_ios</span>
            </div>
          </div>
        </div>

        {/* Find Card */}
        <div
          onClick={() => navigate('search')}
          className="flex-1 bg-gradient-to-br from-indigo-600 to-indigo-900 rounded-3xl p-6 flex flex-col items-center justify-center relative overflow-hidden active:scale-[0.98] transition-all cursor-pointer shadow-2xl group"
        >
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="mb-6 bg-white/10 p-5 rounded-full backdrop-blur-xl border border-white/20">
              <span className="material-symbols-outlined text-7xl text-white font-bold opacity-100">search</span>
            </div>
            <h2 className="text-4xl font-bold text-white mb-2 tracking-wide">{t('home.search')}</h2>
            <p className="text-white/70 text-base font-medium">{t('home.searchDesc')}</p>
          </div>
        </div>
      </div>

      <footer className="mt-10">
        <button
          onClick={() => navigate('list')}
          className="w-full bg-[#1c1c1e] border border-white/5 py-5 px-6 rounded-3xl flex items-center justify-between active:scale-[0.99] transition-transform hover:bg-white/5"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
              <span className="material-symbols-outlined text-white/70">inventory_2</span>
            </div>
            <div className="text-left">
              <span className="block font-semibold text-white">{t('home.allItems')}</span>
              <span className="text-xs text-white/40">{t('home.itemCount', { count: itemCount })}</span>
            </div>
          </div>
          <span className="material-symbols-outlined text-white/30">chevron_right</span>
        </button>
      </footer>

      <div className="mt-8 flex justify-center">
        <div className="w-32 h-1 bg-white/10 rounded-full"></div>
      </div>
    </div>
  );
};

export default HomeView;