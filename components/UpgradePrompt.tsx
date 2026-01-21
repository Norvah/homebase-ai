
import React, { useState } from 'react';
import { linkEmailPassword } from '../services/auth';

interface UpgradePromptProps {
    onSuccess: () => void;
    onDismiss: () => void;
    itemCount: number;
}

/**
 * 注册引导弹窗
 * 当匿名用户记录到第 5 个物品时显示
 */
const UpgradePrompt: React.FC<UpgradePromptProps> = ({ onSuccess, onDismiss, itemCount }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

        if (password !== confirmPassword) {
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

        try {
            await linkEmailPassword(email, password);
            onSuccess();
        } catch (err: any) {
            const message = err?.message || '操作失败，请重试';
            if (message.includes('email_exists')) {
                setError('该邮箱已被使用');
            } else {
                setError(message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
            {/* 背景遮罩 */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onDismiss}
            />

            {/* 弹窗内容 */}
            <div className="relative w-[90%] max-w-sm bg-[#1c1c1e] rounded-3xl p-8 border border-white/10 shadow-2xl animate-in zoom-in-95 duration-300">
                {/* 顶部图标 */}
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/30">
                        <span className="material-symbols-outlined text-3xl text-primary">cloud_upload</span>
                    </div>
                </div>

                {/* 标题 */}
                <h2 className="text-xl font-bold text-white text-center mb-2">
                    保存你的数据
                </h2>
                <p className="text-white/50 text-sm text-center mb-6">
                    你已经记录了 <span className="text-primary font-bold">{itemCount}</span> 件物品！
                    注册后数据云端同步，换设备也不丢失
                </p>

                {/* 表单 */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-lg">mail</span>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="邮箱"
                                disabled={isLoading}
                                className="w-full bg-white/5 border border-white/10 rounded-xl h-12 pl-11 pr-4 text-white placeholder:text-white/30 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all disabled:opacity-50 text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-lg">lock</span>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="设置密码"
                                disabled={isLoading}
                                className="w-full bg-white/5 border border-white/10 rounded-xl h-12 pl-11 pr-4 text-white placeholder:text-white/30 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all disabled:opacity-50 text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-lg">lock</span>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="确认密码"
                                disabled={isLoading}
                                className="w-full bg-white/5 border border-white/10 rounded-xl h-12 pl-11 pr-4 text-white placeholder:text-white/30 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all disabled:opacity-50 text-sm"
                            />
                        </div>
                    </div>

                    {/* 错误提示 */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-red-500 text-base">error</span>
                            <p className="text-red-400 text-xs">{error}</p>
                        </div>
                    )}

                    {/* 按钮 */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full bg-primary h-12 rounded-xl flex items-center justify-center gap-2 text-white font-bold shadow-lg transition-all ${isLoading ? 'opacity-70 cursor-not-allowed' : 'active:scale-95'}`}
                    >
                        {isLoading ? (
                            <>
                                <span className="material-symbols-outlined text-lg animate-spin">sync</span>
                                <span>处理中...</span>
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-lg">person_add</span>
                                <span>立即注册</span>
                            </>
                        )}
                    </button>
                </form>

                {/* 稍后按钮 */}
                <button
                    onClick={onDismiss}
                    disabled={isLoading}
                    className="w-full mt-4 py-3 text-white/40 text-sm font-medium hover:text-white/60 transition-colors disabled:opacity-50"
                >
                    稍后再说
                </button>
            </div>
        </div>
    );
};

export default UpgradePrompt;
