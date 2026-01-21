/**
 * 用户资料服务
 * 管理用户扩展信息和付费状态
 */

import { supabase } from './supabase';

// 普通用户物品存储限制
export const DEFAULT_ITEM_LIMIT = 20;

// 付费用户物品存储限制（无限）
export const PREMIUM_ITEM_LIMIT = 999999;

export interface UserProfile {
    id: string;
    email: string | null;
    nickname: string | null;
    avatarUrl: string | null;
    isPremium: boolean;
    premiumExpiresAt: Date | null;
    itemLimit: number;
    createdAt: Date;
}

/**
 * 将数据库记录转换为 UserProfile 类型
 */
const mapDbToProfile = (record: any): UserProfile => ({
    id: record.id,
    email: record.email,
    nickname: record.nickname,
    avatarUrl: record.avatar_url,
    isPremium: record.is_premium || false,
    premiumExpiresAt: record.premium_expires_at ? new Date(record.premium_expires_at) : null,
    itemLimit: record.item_limit || DEFAULT_ITEM_LIMIT,
    createdAt: new Date(record.created_at),
});

/**
 * 获取当前用户资料
 */
export const getProfile = async (): Promise<UserProfile | null> => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error) {
        // 如果没有找到 profile，可能是匿名用户或尚未创建
        if (error.code === 'PGRST116') {
            return null;
        }
        console.error('获取用户资料失败:', error);
        throw error;
    }

    return mapDbToProfile(data);
};

/**
 * 创建用户资料（用于匿名用户升级时）
 */
export const createProfile = async (userId: string, email?: string): Promise<UserProfile> => {
    const { data, error } = await supabase
        .from('profiles')
        .insert({
            id: userId,
            email: email || null,
            item_limit: DEFAULT_ITEM_LIMIT,
        })
        .select()
        .single();

    if (error) {
        console.error('创建用户资料失败:', error);
        throw error;
    }

    return mapDbToProfile(data);
};

/**
 * 更新用户资料
 */
export const updateProfile = async (updates: Partial<UserProfile>): Promise<UserProfile> => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('用户未登录');

    const { data, error } = await supabase
        .from('profiles')
        .update({
            nickname: updates.nickname,
            avatar_url: updates.avatarUrl,
            updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single();

    if (error) {
        console.error('更新用户资料失败:', error);
        throw error;
    }

    return mapDbToProfile(data);
};

/**
 * 检查当前用户是否为付费用户
 */
export const isPremiumUser = async (): Promise<boolean> => {
    const profile = await getProfile();

    if (!profile) return false;

    // 检查是否付费且未过期
    if (profile.isPremium && profile.premiumExpiresAt) {
        return new Date() < profile.premiumExpiresAt;
    }

    return profile.isPremium;
};

/**
 * 获取用户物品存储限制
 */
export const getItemLimit = async (): Promise<number> => {
    const isPremium = await isPremiumUser();
    return isPremium ? PREMIUM_ITEM_LIMIT : DEFAULT_ITEM_LIMIT;
};

/**
 * 检查用户是否可以添加更多物品
 */
export const canAddItem = async (currentItemCount: number): Promise<boolean> => {
    const limit = await getItemLimit();
    return currentItemCount < limit;
};
