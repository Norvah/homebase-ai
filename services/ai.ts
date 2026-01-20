/**
 * AI 服务统一入口
 * 通过环境变量 VITE_AI_PROVIDER 切换 AI 提供商
 * 
 * 支持的提供商：
 * - gemini (默认)
 * - deepseek
 */

import * as gemini from './gemini';
import * as deepseek from './deepseek';
import { Item } from '../types';

// 支持的 AI 提供商类型
export type AIProvider = 'gemini' | 'deepseek';

/**
 * 获取当前配置的 AI 提供商
 * 默认使用 Gemini
 */
export const getProvider = (): AIProvider => {
    const provider = import.meta.env.VITE_AI_PROVIDER || 'gemini';
    if (provider === 'deepseek' || provider === 'gemini') {
        return provider;
    }
    console.warn(`未知的 AI 提供商: ${provider}，使用默认值 gemini`);
    return 'gemini';
};

/**
 * 获取当前 AI 服务实例
 */
const getService = () => {
    const provider = getProvider();
    return provider === 'deepseek' ? deepseek : gemini;
};

/**
 * 结合图片和语音描述解析物品信息
 */
export const processRecording = async (base64Image: string, transcript: string) => {
    return getService().processRecording(base64Image, transcript);
};

/**
 * 根据语音指令智能更新特定字段
 */
export const smartUpdateField = async (currentValue: string, voiceCommand: string, fieldType: 'name' | 'location') => {
    return getService().smartUpdateField(currentValue, voiceCommand, fieldType);
};

/**
 * 仅识别物体及其位置
 */
export const identifyObject = async (base64Image: string) => {
    return getService().identifyObject(base64Image);
};

/**
 * 根据自然语言查询在列表中查找匹配项
 */
export const findItems = async (query: string, items: Item[]) => {
    return getService().findItems(query, items);
};
