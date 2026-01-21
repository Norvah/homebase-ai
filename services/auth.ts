/**
 * 认证服务
 * 封装 Supabase Auth 操作
 * 支持匿名登录和账号升级
 */

import { supabase } from './supabase';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';

export type { User, Session };

/**
 * 匿名登录
 * 用户无需注册即可使用应用
 */
export const signInAnonymously = async () => {
    const { data, error } = await supabase.auth.signInAnonymously();

    if (error) {
        console.error('匿名登录失败:', error);
        throw error;
    }

    return data;
};

/**
 * 判断用户是否为匿名用户
 */
export const isAnonymousUser = (user: User | null): boolean => {
    if (!user) return false;
    return user.is_anonymous === true;
};

/**
 * 将匿名用户升级为正式用户
 * 绑定邮箱和密码后，用户数据保留
 */
export const linkEmailPassword = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.updateUser({
        email,
        password,
    });

    if (error) {
        console.error('账号升级失败:', error);
        throw error;
    }

    return data;
};

/**
 * 用户注册
 * @param email 邮箱
 * @param password 密码（至少 6 位）
 */
export const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error) {
        console.error('注册失败:', error);
        throw error;
    }

    return data;
};

/**
 * 用户登录
 */
export const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        console.error('登录失败:', error);
        throw error;
    }

    return data;
};

/**
 * 用户登出
 */
export const signOut = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
        console.error('登出失败:', error);
        throw error;
    }
};

/**
 * 获取当前登录用户
 */
export const getCurrentUser = async (): Promise<User | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
};

/**
 * 获取当前会话
 */
export const getSession = async (): Promise<Session | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
};

/**
 * 监听认证状态变化
 * @param callback 状态变化回调
 * @returns 取消订阅函数
 */
export const onAuthStateChange = (
    callback: (event: AuthChangeEvent, session: Session | null) => void
) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
    return () => subscription.unsubscribe();
};
