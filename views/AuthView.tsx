
import React, { useState } from 'react';
import { signIn, signUp, linkEmailPassword, signInWithGoogle, signInWithApple } from '../services/auth';
import { useI18n } from '../i18n';

interface AuthViewProps {
    onAuthSuccess: () => void;
    onBack?: () => void;
    isAnonymous?: boolean; // 是否为匿名用户
}

type AuthMode = 'login' | 'register';

const AuthView: React.FC<AuthViewProps> = ({ onAuthSuccess, onBack, isAnonymous }) => {
    const { t } = useI18n();
    const [mode, setMode] = useState<AuthMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showBackConfirm, setShowBackConfirm] = useState(false);

    const validateForm = (): boolean => {
        setError(null);

        if (!email.trim()) {
            setError(t('auth.enterEmail'));
            return false;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError(t('auth.invalidEmail'));
            return false;
        }

        if (!password) {
            setError(t('auth.enterPassword'));
            return false;
        }

        if (password.length < 6) {
            setError(t('auth.passwordMinLength'));
            return false;
        }

        if (mode === 'register' && password !== confirmPassword) {
            setError(t('auth.passwordMismatch'));
            return false;
        }

        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setIsLoading(true);
        setError(null);
        setSuccess(null);

        try {
            if (mode === 'register') {
                if (isAnonymous) {
                    // 匿名用户升级账号，保留现有数据
                    await linkEmailPassword(email, password);
                    onAuthSuccess();
                } else {
                    // 新用户注册
                    await signUp(email, password);
                    setSuccess(t('auth.registerSuccess'));
                    setMode('login');
                    setPassword('');
                    setConfirmPassword('');
                }
            } else {
                await signIn(email, password);
                onAuthSuccess();
            }
        } catch (err: any) {
            const message = err?.message || t('common.error');
            // 翻译常见错误信息
            if (message.includes('Invalid login credentials')) {
                setError(t('auth.invalidCredentials'));
            } else if (message.includes('Email not confirmed')) {
                setError(t('auth.emailNotConfirmed'));
            } else if (message.includes('User already registered')) {
                setError(t('auth.emailExists'));
            } else {
                setError(message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const toggleMode = () => {
        setMode(mode === 'login' ? 'register' : 'login');
        setError(null);
        setSuccess(null);
        setConfirmPassword('');
    };

    return (
        <div className="relative h-full w-full bg-background-dark flex flex-col overflow-hidden">
            {/* 顶部装饰 */}
            <div className="absolute top-0 left-0 right-0 h-[40vh] bg-gradient-to-b from-primary/10 to-transparent" />

            <div className="flex-1 overflow-y-auto no-scrollbar pt-10 pb-8 px-6 relative z-10 flex flex-col items-center">
                {/* Logo 区域 */}
                <div className="mb-6 text-center shrink-0">
                    <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/30 shadow-lg shadow-primary/20">
                        <span className="material-symbols-outlined text-3xl text-primary">home</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">{t('app.name')}</h1>
                    <p className="text-white/40 text-sm mt-2">{t('app.slogan')}</p>
                </div>

                {/* 表单卡片 */}
                <div className="w-full max-w-sm bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10 shadow-2xl mb-4">
                    <h2 className="text-xl font-bold text-white mb-6 text-center">
                        {mode === 'login' ? t('auth.welcome') : t('auth.createAccount')}
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* 邮箱输入 */}
                        <div>
                            <label className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2 block">
                                {t('auth.email')}
                            </label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-xl">mail</span>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    disabled={isLoading}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl h-12 pl-12 pr-4 text-white placeholder:text-white/20 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all disabled:opacity-50"
                                />
                            </div>
                        </div>

                        {/* 密码输入 */}
                        <div>
                            <label className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2 block">
                                {t('auth.password')}
                            </label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-xl">lock</span>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    disabled={isLoading}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl h-12 pl-12 pr-4 text-white placeholder:text-white/20 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all disabled:opacity-50"
                                />
                            </div>
                        </div>

                        {/* 确认密码（仅注册时显示） */}
                        {mode === 'register' && (
                            <div>
                                <label className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2 block">
                                    {t('auth.confirmPassword')}
                                </label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-xl">lock</span>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                        disabled={isLoading}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl h-12 pl-12 pr-4 text-white placeholder:text-white/20 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all disabled:opacity-50"
                                    />
                                </div>
                            </div>
                        )}

                        {/* 错误提示 */}
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-2">
                                <span className="material-symbols-outlined text-red-500 text-lg">error</span>
                                <p className="text-red-400 text-sm">{error}</p>
                            </div>
                        )}

                        {/* 成功提示 */}
                        {success && (
                            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex items-center gap-2">
                                <span className="material-symbols-outlined text-green-500 text-lg">check_circle</span>
                                <p className="text-green-400 text-sm">{success}</p>
                            </div>
                        )}

                        {/* 提交按钮 */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full bg-primary h-14 rounded-xl flex items-center justify-center gap-3 text-white font-bold text-lg shadow-lg transition-all mt-6 ${isLoading ? 'opacity-70 cursor-not-allowed' : 'active:scale-95'}`}
                        >
                            {isLoading ? (
                                <>
                                    <span className="material-symbols-outlined text-xl animate-spin">sync</span>
                                    <span>{t('auth.processing')}</span>
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-xl">
                                        {mode === 'login' ? 'login' : 'person_add'}
                                    </span>
                                    <span>{mode === 'login' ? t('auth.login') : t('auth.register')}</span>
                                </>
                            )}
                        </button>
                    </form>

                    {/* 第三方登录分界线 */}
                    <div className="my-4 flex items-center gap-4">
                        <div className="h-px flex-1 bg-white/10" />
                        <span className="text-white/20 text-[10px] font-bold uppercase tracking-widest">{t('auth.or')}</span>
                        <div className="h-px flex-1 bg-white/10" />
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={async () => {
                                setIsLoading(true);
                                try {
                                    await signInWithGoogle();
                                } catch (err) {
                                    setIsLoading(false);
                                }
                            }}
                            disabled={isLoading}
                            className="w-full h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center gap-3 text-white/80 text-sm font-medium hover:bg-white/10 hover:border-white/20 transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                            <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            <span>{t('auth.loginWithGoogle')}</span>
                        </button>

                        <button
                            onClick={async () => {
                                setIsLoading(true);
                                try {
                                    await signInWithApple();
                                } catch (err) {
                                    setIsLoading(false);
                                }
                            }}
                            disabled={isLoading}
                            className="w-full h-12 rounded-xl bg-white text-black flex items-center justify-center gap-3 text-sm font-bold hover:bg-white/90 transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg"
                        >
                            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
                                <path d="M17.05 20.28c-.96.95-2.12 2.22-3.85 2.22-1.63 0-2.35-1.02-4.14-1.02s-2.6.96-4.05.96c-1.54 0-2.79-1.31-3.83-2.82C.1 18.06-1.55 13.04 1.1 9.4c1.33-1.84 3.14-2.92 4.98-2.92 1.6 0 2.76.96 4.14.96s2.54-.96 4.14-.96c1.35 0 2.89.6 4.1 2.05-3.5 1.74-2.88 6.45.69 8zM12.03 5.48c-.02-2.19 1.58-4.22 3.65-4.48.24 2.51-2.06 4.67-3.65 4.48z" />
                            </svg>
                            <span>{t('auth.loginWithApple')}</span>
                        </button>
                    </div>

                    {/* 切换模式 */}
                    <div className="mt-4 text-center border-t border-white/5 pt-4">
                        <button
                            onClick={toggleMode}
                            disabled={isLoading}
                            className="text-white/40 text-sm hover:text-white transition-colors disabled:opacity-50"
                        >
                            {mode === 'login' ? t('auth.noAccount') : t('auth.hasAccount')}
                        </button>
                    </div>
                </div>

                {/* 返回按钮（从绝对定位改为文档流） */}
                {onBack && (
                    <button
                        onClick={() => setShowBackConfirm(true)}
                        disabled={isLoading}
                        className="text-white/30 text-sm hover:text-white/50 transition-colors disabled:opacity-50 flex items-center gap-1 py-4 px-8"
                    >
                        <span className="material-symbols-outlined text-base">arrow_back</span>
                        <span>{t('auth.laterText')}</span>
                    </button>
                )}
            </div>

            {/* 确认返回弹窗 */}
            {showBackConfirm && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        onClick={() => setShowBackConfirm(false)}
                    />
                    <div className="relative w-[85%] max-w-sm bg-[#1c1c1e] rounded-3xl p-6 border border-white/10 shadow-2xl">
                        <div className="flex justify-center mb-4">
                            <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/30">
                                <span className="material-symbols-outlined text-2xl text-primary">card_giftcard</span>
                            </div>
                        </div>
                        <h3 className="text-lg font-bold text-white text-center mb-2">{t('upgrade.benefit')}</h3>
                        <p className="text-white/50 text-sm text-center mb-6 leading-relaxed">
                            {t('upgrade.benefitDesc', {
                                unlimited: t('upgrade.unlimited'),
                                sync: t('upgrade.sync')
                            })}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowBackConfirm(false);
                                    onBack?.();
                                }}
                                className="flex-1 h-11 rounded-xl bg-white/5 border border-white/10 text-white/50 text-sm font-medium active:scale-95 transition-all"
                            >
                                {t('upgrade.skip')}
                            </button>
                            <button
                                onClick={() => {
                                    setShowBackConfirm(false);
                                    setMode('register');
                                }}
                                className="flex-1 h-11 rounded-xl bg-primary text-white text-sm font-bold active:scale-95 transition-all"
                            >
                                {t('upgrade.now')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuthView;

