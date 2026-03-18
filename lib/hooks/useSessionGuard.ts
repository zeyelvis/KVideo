/**
 * useSessionGuard — 多设备登录限制客户端守卫
 *
 * 功能：
 * 1. 生成并持久化设备指纹
 * 2. 登录后向服务端注册设备
 * 3. 每 60 秒心跳，检测是否被踢
 * 4. 被踢后弹出提示并强制登出
 */
'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useUserStore } from '@/lib/store/user-store';

const HEARTBEAT_INTERVAL = 60_000; // 60 秒
const DEVICE_ID_KEY = 'kvideo-device-id';

/** 生成随机设备指纹 */
function generateDeviceId(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

/** 获取或创建设备 ID */
function getDeviceId(): string {
    if (typeof window === 'undefined') return '';
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
        id = generateDeviceId();
        localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
}

/** 推断设备名称 */
function getDeviceName(): string {
    if (typeof navigator === 'undefined') return '未知设备';
    const ua = navigator.userAgent;
    if (/iPhone/i.test(ua)) return 'iPhone';
    if (/iPad/i.test(ua)) return 'iPad';
    if (/Android/i.test(ua)) return 'Android 设备';
    if (/Mac/i.test(ua)) return 'Mac 电脑';
    if (/Windows/i.test(ua)) return 'Windows 电脑';
    if (/Linux/i.test(ua)) return 'Linux 设备';
    return '浏览器';
}

/** 会话 API 调用 */
async function sessionApi(action: string, userId: string, deviceId: string) {
    try {
        // 获取 Supabase access token 用于身份验证
        const { supabase } = await import('@/lib/supabase/client');
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (session?.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const res = await fetch('/api/session', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                action,
                userId,
                deviceId,
                deviceName: getDeviceName(),
            }),
        });
        return await res.json();
    } catch {
        return { success: false };
    }
}

export function useSessionGuard() {
    const user = useUserStore(s => s.user);
    const logout = useUserStore(s => s.logout);
    const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isKickedRef = useRef(false);

    // 被踢出时的处理
    const handleKicked = useCallback(() => {
        if (isKickedRef.current) return; // 防止重复触发
        isKickedRef.current = true;

        // 停止心跳
        if (heartbeatRef.current) {
            clearInterval(heartbeatRef.current);
            heartbeatRef.current = null;
        }

        // 弹出提示
        // 使用自定义事件让外部 UI 响应（避免在 hook 里直接操作 DOM）
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('session-kicked', {
                detail: { message: '你的账号已在其他设备登录，当前设备已被登出' }
            }));
        }

        // 强制登出
        logout();
    }, [logout]);

    // 心跳
    const startHeartbeat = useCallback((userId: string) => {
        const deviceId = getDeviceId();
        if (!deviceId) return;

        // 清理旧心跳
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);

        heartbeatRef.current = setInterval(async () => {
            const result = await sessionApi('heartbeat', userId, deviceId);
            if (result.success && result.valid === false) {
                handleKicked();
            }
        }, HEARTBEAT_INTERVAL);
    }, [handleKicked]);

    // 注册设备
    const registerDevice = useCallback(async (userId: string) => {
        const deviceId = getDeviceId();
        if (!deviceId) return;

        isKickedRef.current = false;
        const result = await sessionApi('register', userId, deviceId);

        if (result.success) {
            startHeartbeat(userId);
        }
    }, [startHeartbeat]);

    // 清理设备（登出时调用）
    const unregisterDevice = useCallback(async (userId: string) => {
        const deviceId = getDeviceId();
        if (!deviceId) return;

        if (heartbeatRef.current) {
            clearInterval(heartbeatRef.current);
            heartbeatRef.current = null;
        }

        await sessionApi('logout', userId, deviceId);
    }, []);

    // 监听用户登录/登出
    useEffect(() => {
        if (user?.id) {
            registerDevice(user.id);
        }

        return () => {
            if (heartbeatRef.current) {
                clearInterval(heartbeatRef.current);
                heartbeatRef.current = null;
            }
        };
    }, [user?.id, registerDevice]);

    // 页面关闭时发送登出信号
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (user?.id) {
                const deviceId = getDeviceId();
                // 使用 sendBeacon 确保页面关闭时仍能发送
                navigator.sendBeacon('/api/session', JSON.stringify({
                    action: 'logout',
                    userId: user.id,
                    deviceId,
                }));
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [user?.id]);

    return { registerDevice, unregisterDevice };
}

/**
 * 导出设备 ID 获取函数，供 user-store 在登出时调用
 */
export { getDeviceId };
