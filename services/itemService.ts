/**
 * 物品数据服务
 * 封装所有与 Supabase 的物品 CRUD 操作
 */

import { supabase, IMAGE_BUCKET } from './supabase';
import { Item } from '../types';

// 数据库表名
const TABLE_NAME = 'items';

/**
 * 将数据库记录转换为前端 Item 类型
 */
const mapDbToItem = (record: any): Item => ({
    id: record.id,
    name: record.name,
    location: record.location,
    imageUrl: record.image_url || '',
    timestamp: new Date(record.created_at).getTime(),
    isRemoved: record.is_removed || false,
});

/**
 * 将前端 Item 转换为数据库记录格式
 */
const mapItemToDb = (item: Partial<Item>) => ({
    name: item.name,
    location: item.location,
    image_url: item.imageUrl,
    is_removed: item.isRemoved,
});

/**
 * 获取所有物品列表
 * 按创建时间倒序排列（最新的在前）
 */
export const fetchItems = async (): Promise<Item[]> => {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('获取物品列表失败:', error);
        throw error;
    }

    return (data || []).map(mapDbToItem);
};

/**
 * 创建新物品
 * @param item 物品信息（不包含 id，由数据库自动生成）
 * 自动关联当前登录用户
 */
export const createItem = async (item: Omit<Item, 'id'>): Promise<Item> => {
    // 获取当前用户 ID
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('用户未登录');
    }

    const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert({
            name: item.name,
            location: item.location,
            image_url: item.imageUrl,
            is_removed: item.isRemoved || false,
            user_id: user.id,
        })
        .select()
        .single();

    if (error) {
        console.error('创建物品失败:', error);
        throw error;
    }

    return mapDbToItem(data);
};

/**
 * 更新物品信息
 * @param id 物品 ID
 * @param updates 要更新的字段
 */
export const updateItem = async (id: string, updates: Partial<Item>): Promise<Item> => {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .update({
            ...mapItemToDb(updates),
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('更新物品失败:', error);
        throw error;
    }

    return mapDbToItem(data);
};

/**
 * 批量删除物品
 * @param ids 要删除的物品 ID 数组
 */
export const deleteItems = async (ids: string[]): Promise<void> => {
    const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .in('id', ids);

    if (error) {
        console.error('删除物品失败:', error);
        throw error;
    }
};

/**
 * 上传图片到 Supabase Storage
 * @param base64Image Base64 格式的图片数据
 * @returns 图片的公开 URL
 */
export const uploadImage = async (base64Image: string): Promise<string> => {
    // 将 base64 转换为 Blob
    const base64Data = base64Image.split(',')[1] || base64Image;
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/jpeg' });

    // 生成唯一文件名
    const fileName = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;

    // 上传到 Supabase Storage
    const { error: uploadError } = await supabase.storage
        .from(IMAGE_BUCKET)
        .upload(fileName, blob, {
            contentType: 'image/jpeg',
            upsert: false,
        });

    if (uploadError) {
        console.error('图片上传失败:', uploadError);
        throw uploadError;
    }

    // 获取公开 URL
    const { data: urlData } = supabase.storage
        .from(IMAGE_BUCKET)
        .getPublicUrl(fileName);

    return urlData.publicUrl;
};
