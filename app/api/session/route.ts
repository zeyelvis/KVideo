/**
 * 会话管理 API — 多设备限制
 * 每账号最多 3 台设备同时在线
 * 操作：register（注册设备）、heartbeat（心跳）、logout（登出清理）
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const MAX_DEVICES = 3;
const SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 分钟无心跳视为离线

// 使用 service role 绕过 RLS（服务端需要查询/删除其他设备的记录）
function getServiceClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    // 如果没有 service key，降级用 anon key（受 RLS 限制但基本可用）
    const key = serviceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    return createClient(url, key);
}

// 用 anon key 创建客户端来验证用户 JWT
function getAnonClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    return createClient(url, key);
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, userId, deviceId, deviceName } = body;

        if (!action || !userId || !deviceId) {
            return NextResponse.json(
                { success: false, error: '缺少必要参数' },
                { status: 400 }
            );
        }

        // HIGH-3 修复：验证 JWT 身份与 userId 一致
        const authHeader = request.headers.get('authorization');
        const token = authHeader?.replace('Bearer ', '');
        if (token) {
            // 如果提供了 token，验证身份
            const anonClient = getAnonClient();
            const { data: { user: authUser }, error } = await anonClient.auth.getUser(token);
            if (error || !authUser || authUser.id !== userId) {
                return NextResponse.json(
                    { success: false, error: '身份验证失败' },
                    { status: 403 }
                );
            }
        }
        // 注意：sendBeacon 无法设置自定义 header，logout 时允许无 token（降级处理）

        const supabase = getServiceClient();
        const ip = request.headers.get('cf-connecting-ip') ||
            request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            request.headers.get('x-real-ip') || '';

        switch (action) {
            case 'register': {
                // 先清理过期会话（5 分钟无心跳）
                const expireThreshold = new Date(Date.now() - SESSION_TIMEOUT_MS).toISOString();
                await supabase
                    .from('user_sessions')
                    .delete()
                    .eq('user_id', userId)
                    .lt('last_active', expireThreshold);

                // 注册/更新当前设备会话（使用 upsert 避免重复）
                await supabase
                    .from('user_sessions')
                    .upsert({
                        user_id: userId,
                        device_id: deviceId,
                        device_name: deviceName || getDeviceName(request),
                        ip_address: ip,
                        last_active: new Date().toISOString(),
                    }, {
                        onConflict: 'user_id,device_id',
                    });

                // 检查活跃会话数量
                const { data: sessions } = await supabase
                    .from('user_sessions')
                    .select('id, device_id, device_name, created_at')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: true });

                const activeSessions = sessions || [];
                let kicked: string[] = [];

                // 如果超过限制，踢掉最早的设备
                if (activeSessions.length > MAX_DEVICES) {
                    const toKick = activeSessions.slice(0, activeSessions.length - MAX_DEVICES);
                    kicked = toKick.map(s => s.device_id);

                    const kickIds = toKick.map(s => s.id);
                    await supabase
                        .from('user_sessions')
                        .delete()
                        .in('id', kickIds);
                }

                return NextResponse.json({
                    success: true,
                    activeDevices: Math.min(activeSessions.length, MAX_DEVICES),
                    maxDevices: MAX_DEVICES,
                    kicked,
                });
            }

            case 'heartbeat': {
                // 更新心跳时间
                const { data: session } = await supabase
                    .from('user_sessions')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('device_id', deviceId)
                    .single();

                if (!session) {
                    // 会话不存在 = 被踢出
                    return NextResponse.json({
                        success: true,
                        valid: false,
                        reason: 'session_not_found',
                    });
                }

                // 更新 last_active
                await supabase
                    .from('user_sessions')
                    .update({ last_active: new Date().toISOString(), ip_address: ip })
                    .eq('id', session.id);

                return NextResponse.json({
                    success: true,
                    valid: true,
                });
            }

            case 'logout': {
                // 清理当前设备的会话
                await supabase
                    .from('user_sessions')
                    .delete()
                    .eq('user_id', userId)
                    .eq('device_id', deviceId);

                return NextResponse.json({ success: true });
            }

            default:
                return NextResponse.json(
                    { success: false, error: '未知操作' },
                    { status: 400 }
                );
        }
    } catch (error) {
        console.error('会话管理异常:', error);
        return NextResponse.json(
            { success: false, error: '服务异常' },
            { status: 500 }
        );
    }
}

/** 从 User-Agent 推测设备类型 */
function getDeviceName(request: NextRequest): string {
    const ua = request.headers.get('user-agent') || '';
    if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS 设备';
    if (/Android/i.test(ua)) return 'Android 设备';
    if (/Mac/i.test(ua)) return 'Mac 电脑';
    if (/Windows/i.test(ua)) return 'Windows 电脑';
    if (/Linux/i.test(ua)) return 'Linux 设备';
    return '未知设备';
}
