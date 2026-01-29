/**
 * 国际化服务
 * 提供语言切换和翻译功能
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import zh from './locales/zh';
import en from './locales/en';

// 支持的语言类型
export type Locale = 'zh' | 'en';

// 语言包类型
type Messages = typeof zh;

// 语言包映射
const messages: Record<Locale, Messages> = {
    zh,
    en,
};

// 语言名称映射
export const localeNames: Record<Locale, string> = {
    zh: '中文',
    en: 'English',
};

// 本地存储 key
const LOCALE_STORAGE_KEY = 'homebase_locale';

// 获取默认语言
const getDefaultLocale = (): Locale => {
    // 从本地存储读取（用户手动选择的语言优先）
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (saved === 'zh' || saved === 'en') {
        return saved;
    }

    // 默认英文
    return 'en';
};

// Context 类型
interface I18nContextType {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: string, params?: Record<string, string | number>) => string;
}

// 创建 Context
const I18nContext = createContext<I18nContextType | null>(null);

// Provider 组件
interface I18nProviderProps {
    children: ReactNode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
    const [locale, setLocaleState] = useState<Locale>(getDefaultLocale);

    // 切换语言
    const setLocale = (newLocale: Locale) => {
        setLocaleState(newLocale);
        localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    };

    // 翻译函数
    const t = (key: string, params?: Record<string, string | number>): string => {
        const keys = key.split('.');
        let value: any = messages[locale];

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                // 如果当前语言没有找到，尝试从中文语言包获取
                value = messages.zh;
                for (const fallbackKey of keys) {
                    if (value && typeof value === 'object' && fallbackKey in value) {
                        value = value[fallbackKey];
                    } else {
                        return key; // 返回 key 作为 fallback
                    }
                }
                break;
            }
        }

        if (typeof value !== 'string') {
            return key;
        }

        // 替换参数 {param}
        if (params) {
            return value.replace(/\{(\w+)\}/g, (_, paramKey) => {
                return String(params[paramKey] ?? `{${paramKey}}`);
            });
        }

        return value;
    };

    return (
        <I18nContext.Provider value={{ locale, setLocale, t }
        }>
            {children}
        </I18nContext.Provider>
    );
};

// 自定义 Hook
export const useI18n = (): I18nContextType => {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error('useI18n must be used within an I18nProvider');
    }
    return context;
};

// 导出语言包类型
export type { Messages };
