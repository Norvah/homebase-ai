/**
 * DeepSeek AI 服务
 * 使用 OpenAI 兼容的 API 格式
 * 
 * NOTE: DeepSeek 官方 API 的 deepseek-chat 模型不支持图片输入
 * 视觉相关功能使用纯文本描述处理
 */

import { Item } from "../types";

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';
const CHAT_MODEL = 'deepseek-chat';

const getApiKey = () => import.meta.env.VITE_DEEPSEEK_API_KEY || '';

/**
 * 调用 DeepSeek API
 */
const callDeepSeekAPI = async (messages: any[], responseFormat?: any): Promise<string> => {
    const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getApiKey()}`,
        },
        body: JSON.stringify({
            model: CHAT_MODEL,
            messages,
            response_format: responseFormat,
            max_tokens: 1024,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`DeepSeek API Error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
};

/**
 * 带有指数退避的重试包装器
 */
const withRetry = async <T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> => {
    let delay = 2000;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error: any) {
            const errorMsg = error?.message || "";
            const isRateLimit = errorMsg.includes('429') || errorMsg.includes('rate_limit');

            if (isRateLimit && i < maxRetries - 1) {
                console.warn(`DeepSeek API 429 错误，第 ${i + 1} 次重试，延迟 ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2;
                continue;
            }
            throw error;
        }
    }
    throw new Error('超出重试次数限制');
};

/**
 * 结合语音描述解析物品信息
 * NOTE: DeepSeek 不支持图片，仅基于语音描述进行解析
 */
export const processRecording = async (_base64Image: string, transcript: string) => {
    return withRetry(async () => {
        const content = await callDeepSeekAPI([
            {
                role: 'system',
                content: '你是一个物品存放助手。用户会描述他们存放物品的信息，请从描述中提取物品名称和存放位置。',
            },
            {
                role: 'user',
                content: `用户口述了以下描述："${transcript || '用户未提供语音描述'}"。

请从描述中提取：
1. 物品名称（简洁，如：车钥匙、护照）
2. 存放位置（详细，如：客厅进门右手边第二个抽屉里）

如果描述不够清晰，请根据合理推测填写。
请以 JSON 格式返回：{ "name": "物品名称", "location": "位置描述" }`,
            },
        ], { type: 'json_object' });

        return JSON.parse(content || '{"name": "未知物品", "location": "请手动输入位置"}');
    });
};

/**
 * 根据语音指令智能更新特定字段
 */
export const smartUpdateField = async (currentValue: string, voiceCommand: string, fieldType: 'name' | 'location') => {
    return withRetry(async () => {
        const fieldName = fieldType === 'name' ? '物品名称' : '位置描述';

        const content = await callDeepSeekAPI([
            {
                role: 'user',
                content: `当前${fieldName}为："${currentValue}"。
用户的最新语音指令是："${voiceCommand}"。

请严格遵循以下规则生成更新后的内容：
1. 必须忠实于用户的最新指令。如果指令中没有提到细节，绝对严禁自行添加。
2. 如果指令是一个全新的描述，请直接用新描述替换旧描述。
3. 如果指令是补充性的（如"再加个标签"），则在旧内容基础上补充。

请只返回更新后的字符串内容，不要包含任何解释或引号。`,
            },
        ]);

        return content?.trim() || currentValue;
    });
};

/**
 * 仅识别物体及其位置
 * NOTE: DeepSeek 不支持图片，返回提示信息
 */
export const identifyObject = async (_base64Image: string) => {
    // DeepSeek 不支持图片输入，返回默认提示
    console.warn('DeepSeek 不支持图片识别，请使用语音描述或切换到 Gemini');
    return {
        name: '请描述物品',
        location: '请描述存放位置',
    };
};

/**
 * 根据自然语言查询在列表中查找匹配项
 * 匹配规则：查询越简短匹配越宽泛，查询越详细匹配越精确
 */
export const findItems = async (query: string, items: Item[]) => {
    return withRetry(async () => {
        const itemsContext = items.map(i => `${i.id}: ${i.name} 在 ${i.location}`).join('\n');

        const content = await callDeepSeekAPI([
            {
                role: 'user',
                content: `根据用户的查询："${query}"，从以下物品列表中识别匹配的物品。

**重要匹配规则**：
1. 采用"包含匹配"原则：如果物品名称包含用户查询的关键词，则应该匹配。
2. 查询越简短，匹配越宽泛。例如：
   - 用户说"项链"，应匹配所有名称中包含"项链"的物品（如"项链"、"珍珠项链"、"金项链"都应匹配）
   - 用户说"珍珠项链"，应只匹配名称中同时包含"珍珠"和"项链"的物品
3. 查询越详细、描述越具体，匹配应越精确。
4. 如果用户描述了位置特征，也应考虑位置信息进行匹配。

返回匹配物品 ID 的列表，JSON 格式：{ "matchedIds": ["id1", "id2"] }。
如果没有匹配项，返回空数组。
物品列表：
${itemsContext}`,
            },
        ], { type: 'json_object' });

        const result = JSON.parse(content || '{"matchedIds": []}');
        return result.matchedIds as string[];
    });
};
