
import { GoogleGenAI, Type } from "@google/genai";
import { Item } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });

/**
 * 带有指数退避的重试包装器
 * 用于处理 429 RESOURCE_EXHAUSTED 等临时性频率限制错误
 */
const withRetry = async <T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> => {
  let delay = 2000; // 初始延迟 2秒
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      const errorMsg = error?.message || "";
      // 检查是否为 429 频率限制错误
      const isRateLimit = errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED');

      if (isRateLimit && i < maxRetries - 1) {
        console.warn(`检测到 Gemini API 429 错误，正在进行第 ${i + 1} 次自动重试，延迟 ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // 指数退避，增加下一次重试前的等待时间
        continue;
      }
      throw error;
    }
  }
  throw new Error('超出重试次数限制，请稍后再试');
};

/**
 * 结合图片和语音描述解析物品信息
 */
export const processRecording = async (base64Image: string, transcript: string) => {
  return withRetry(async () => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image.split(',')[1] || base64Image,
            },
          },
          {
            text: `用户拍摄了这张照片并口述了描述：“${transcript}”。
            请结合图片内容和语音描述，提取物品的名称和具体存放位置。
            要求：
            1. 名称要简洁（如：车钥匙、护照）。
            2. 位置描述要详细、易于寻找（如：客厅进门右手边第二个抽屉里）。
            3. 如果语音中提到了具体的方位或物品特征，请务必包含。
            
            请以 JSON 格式返回：{ "name": "物品名称", "location": "位置描述" }，语言使用中文。`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            location: { type: Type.STRING },
          },
          required: ["name", "location"],
        },
      },
    });

    return JSON.parse(response.text || '{}');
  });
};

/**
 * 根据语音指令智能更新特定字段
 */
export const smartUpdateField = async (currentValue: string, voiceCommand: string, fieldType: 'name' | 'location') => {
  return withRetry(async () => {
    const ai = getAI();
    const fieldName = fieldType === 'name' ? '物品名称' : '位置描述';

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `当前${fieldName}为：“${currentValue}”。
      用户的最新语音指令是：“${voiceCommand}”。
      
      请严格遵循以下规则生成更新后的内容：
      1. 必须忠实于用户的最新指令。如果指令中没有提到细节，绝对严禁自行添加。
      2. 如果指令是一个全新的描述，请直接用新描述替换旧描述。
      3. 如果指令是补充性的（如“再加个标签”），则在旧内容基础上补充。
      
      请只返回更新后的字符串内容，不要包含任何解释。`,
    });

    return response.text?.trim() || currentValue;
  });
};

/**
 * 仅识别物体及其位置
 */
export const identifyObject = async (base64Image: string) => {
  return withRetry(async () => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image.split(',')[1] || base64Image,
            },
          },
          {
            text: "识别照片中的主体物品，并根据背景描述其具体位置。以 JSON 格式返回: { 'name': '物品名称', 'location': '详细的位置描述' }，使用中文。",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            location: { type: Type.STRING },
          },
          required: ["name", "location"],
        },
      },
    });

    return JSON.parse(response.text || '{}');
  });
};

/**
 * 根据自然语言查询在列表中查找匹配项
 * 匹配规则：查询越简短匹配越宽泛，查询越详细匹配越精确
 */
export const findItems = async (query: string, items: Item[]) => {
  return withRetry(async () => {
    const ai = getAI();
    const itemsContext = items.map(i => `${i.id}: ${i.name} 在 ${i.location}`).join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `根据用户的查询："${query}"，从以下物品列表中识别匹配的物品。

**重要匹配规则**：
1. 采用"包含匹配"原则：如果物品名称包含用户查询的关键词，则应该匹配。
2. 查询越简短，匹配越宽泛。例如：
   - 用户说"项链"，应匹配所有名称中包含"项链"的物品（如"项链"、"珍珠项链"、"金项链"都应匹配）
   - 用户说"珍珠项链"，应只匹配名称中同时包含"珍珠"和"项链"的物品
3. 查询越详细、描述越具体，匹配应越精确。
4. 如果用户描述了位置特征，也应考虑位置信息进行匹配。

返回匹配物品 ID 的列表，JSON 格式：{ "matchedIds": ["id1", "id2"] }。
物品列表：
${itemsContext}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            matchedIds: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["matchedIds"]
        }
      }
    });

    const result = JSON.parse(response.text || '{"matchedIds": []}');
    return result.matchedIds as string[];
  });
};
