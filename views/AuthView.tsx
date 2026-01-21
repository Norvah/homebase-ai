
import React, { useState } from 'react';
import { signIn, signUp, linkEmailPassword } from '../services/auth';

interface AuthViewProps {
    onAuthSuccess: () => void;
    onBack?: () => void;
    isAnonymous?: boolean; // 是否为匿名用户
}

type AuthMode = 'login' | 'register';

const AuthView: React.FC<AuthViewProps> = ({ onAuthSuccess, onBack, isAnonymous }) => {
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
            setError('请输入邮箱');
            return false;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError('请输入有效的邮箱地址');
            return false;
        }

        if (!password) {
            setError('请输入密码');
            return false;
        }

        if (password.length < 6) {
            setError('密码至少需要 6 位');
            return false;
        }

        if (mode === 'register' && password !== confirmPassword) {
            setError('两次输入的密码不一致');
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
                    setSuccess('注册成功！请查收验证邮件后登录');
                    setMode('login');
                    setPassword('');
                    setConfirmPassword('');
                }
            } else {
                await signIn(email, password);
                onAuthSuccess();
            }
        } catch (err: any) {
            const message = err?.message || '操作失败，请重试';
            // 翻译常见错误信息
            if (message.includes('Invalid login credentials')) {
                setError('邮箱或密码错误');
            } else if (message.includes('Email not confirmed')) {
                setError('请先验证邮箱后再登录');
            } else if (message.includes('User already registered')) {
                setError('该邮箱已注册，请直接登录');
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

            <div className="flex-1 flex flex-col items-center justify-center px-8 relative z-10">
                {/* Logo 区域 */}
                <div className="mb-12 text-center">
                    <div className="w-20 h-20 bg-primary/20 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-primary/30 shadow-lg shadow-primary/20">
                        <span className="material-symbols-outlined text-4xl text-primary">home</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">归处</h1>
                    <p className="text-white/40 text-sm mt-2">记录生活的每一个角落</p>
                </div>

                {/* 表单卡片 */}
                <div className="w-full max-w-sm bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl">
                    <h2 className="text-xl font-bold text-white mb-6 text-center">
                        {mode === 'login' ? '欢迎回来' : '创建账号'}
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* 邮箱输入 */}
                        <div>
                            <label className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2 block">
                                邮箱
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
                                密码
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
                                    确认密码
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
                                    <span>处理中...</span>
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-xl">
                                        {mode === 'login' ? 'login' : 'person_add'}
                                    </span>
                                    <span>{mode === 'login' ? '登录' : '注册'}</span>
                                </>
                            )}
                        </button>
                    </form>

                    {/* 切换模式 */}
                    <div className="mt-6 text-center">
                        <button
                            onClick={toggleMode}
                            disabled={isLoading}
                            className="text-white/40 text-sm hover:text-white transition-colors disabled:opacity-50"
                        >
                            {mode === 'login' ? '没有账号？立即注册' : '已有账号？立即登录'}
                        </button>
                    </div>
                </div>
            </div>

            {/* 底部返回按钮 */}
            {onBack && (
                <div className="absolute bottom-8 left-0 right-0 flex justify-center z-20">
                    <button
                        onClick={() => setShowBackConfirm(true)}
                        disabled={isLoading}
                        className="text-white/30 text-sm hover:text-white/50 transition-colors disabled:opacity-50 flex items-center gap-1 py-2 px-4"
                    >
                        <span className="material-symbols-outlined text-base">arrow_back</span>
                        <span>稍后再说</span>
                    </button>
                </div>
            )}

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
                        <h3 className="text-lg font-bold text-white text-center mb-2">现在注册有福利！</h3>
                        <p className="text-white/50 text-sm text-center mb-6 leading-relaxed">
                            立即注册可获得 <span className="text-primary font-bold">无限物品存储</span> + <span className="text-primary font-bold">云端同步</span>，换设备也不丢失数据
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowBackConfirm(false);
                                    onBack?.();
                                }}
                                className="flex-1 h-11 rounded-xl bg-white/5 border border-white/10 text-white/50 text-sm font-medium active:scale-95 transition-all"
                            >
                                先不了
                            </button>
                            <button
                                onClick={() => {
                                    setShowBackConfirm(false);
                                    setMode('register');
                                }}
                                className="flex-1 h-11 rounded-xl bg-primary text-white text-sm font-bold active:scale-95 transition-all"
                            >
                                立即注册
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuthView;
