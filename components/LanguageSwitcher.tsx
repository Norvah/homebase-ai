
import React, { useState } from 'react';
import { useI18n, Locale, localeNames } from '../i18n';

interface LanguageSwitcherProps {
    variant?: 'icon' | 'button' | 'dropdown';
}

/**
 * 语言切换组件
 */
const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ variant = 'button' }) => {
    const { locale, setLocale, t } = useI18n();
    const [showDropdown, setShowDropdown] = useState(false);

    const locales: Locale[] = ['zh', 'en'];

    const toggleLanguage = () => {
        setLocale(locale === 'zh' ? 'en' : 'zh');
    };

    // 图标按钮样式 - 用于主页
    if (variant === 'icon') {
        return (
            <button
                onClick={toggleLanguage}
                className="w-10 h-10 rounded-full bg-white/5 backdrop-blur-md flex items-center justify-center border border-white/10 active:scale-95 transition-transform"
                title={t('settings.language')}
            >
                <span className="text-white text-sm font-bold">
                    {locale === 'zh' ? 'EN' : '中'}
                </span>
            </button>
        );
    }

    // 下拉选择样式 - 用于设置页面
    if (variant === 'dropdown') {
        return (
            <div className="relative">
                <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center justify-between w-full bg-white/5 border border-white/10 rounded-xl h-12 px-4 text-white"
                >
                    <span>{localeNames[locale]}</span>
                    <span className="material-symbols-outlined text-white/50">
                        {showDropdown ? 'expand_less' : 'expand_more'}
                    </span>
                </button>

                {showDropdown && (
                    <div className="absolute top-14 left-0 right-0 bg-[#2c2c2e] border border-white/10 rounded-xl overflow-hidden z-50 shadow-lg">
                        {locales.map((loc) => (
                            <button
                                key={loc}
                                onClick={() => {
                                    setLocale(loc);
                                    setShowDropdown(false);
                                }}
                                className={`w-full px-4 py-3 text-left flex items-center justify-between ${locale === loc ? 'bg-primary/20 text-primary' : 'text-white hover:bg-white/5'
                                    }`}
                            >
                                <span>{localeNames[loc]}</span>
                                {locale === loc && (
                                    <span className="material-symbols-outlined text-primary">check</span>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // 默认按钮样式
    return (
        <button
            onClick={toggleLanguage}
            className="h-9 px-4 rounded-full bg-white/5 backdrop-blur-md flex items-center justify-center gap-1.5 border border-white/10 active:scale-95 transition-transform"
        >
            <span className="material-symbols-outlined text-lg text-white/50">language</span>
            <span className="text-white/70 text-xs font-medium">
                {locale === 'zh' ? 'EN' : '中文'}
            </span>
        </button>
    );
};

export default LanguageSwitcher;
