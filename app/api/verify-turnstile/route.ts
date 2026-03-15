/**
 * Turnstile 服务端验证 API
 * 安全：IP 频率限制（60秒内最多 5 次） + Cloudflare 验证
 */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA';
const TURNSTILE_TEST_SECRET_KEY = '1x0000000000000000000000000000000AA';

// ─── IP 频率限制 ──────────────────────────────
const RATE_LIMIT_WINDOW_MS = 60_000; // 60 秒窗口
const RATE_LIMIT_MAX = 5; // 每窗口最多 5 次

// 简单内存存储（Edge Runtime 下每个 isolate 独立，生产环境建议用 KV）
const ipRequestMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const record = ipRequestMap.get(ip);

    if (!record || now > record.resetAt) {
        ipRequestMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return true;
    }

    if (record.count >= RATE_LIMIT_MAX) {
        return false; // 超限
    }

    record.count++;
    return true;
}

// 定期清理过期记录（防内存泄漏）
function cleanupExpired() {
    const now = Date.now();
    for (const [ip, record] of ipRequestMap) {
        if (now > record.resetAt) ipRequestMap.delete(ip);
    }
}

export async function POST(request: NextRequest) {
    try {
        // 提取客户端 IP
        const ip = request.headers.get('cf-connecting-ip') ||
            request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            request.headers.get('x-real-ip') || 'unknown';

        // IP 频率限制检查
        if (!checkRateLimit(ip)) {
            return NextResponse.json(
                { success: false, error: '请求过于频繁，请稍后再试' },
                { status: 429 }
            );
        }

        // 定期清理（每次请求时触发，开销极小）
        if (ipRequestMap.size > 1000) cleanupExpired();

        const { token } = await request.json();

        if (!token) {
            return NextResponse.json(
                { success: false, error: '缺少验证 token' },
                { status: 400 }
            );
        }

        // 本地开发用测试密钥
        const referer = request.headers.get('referer') || '';
        const isLocal = referer.includes('localhost') || referer.includes('127.0.0.1');
        const secretKey = isLocal ? TURNSTILE_TEST_SECRET_KEY : TURNSTILE_SECRET_KEY;

        const formData = new URLSearchParams();
        formData.append('secret', secretKey);
        formData.append('response', token);

        if (ip !== 'unknown') {
            formData.append('remoteip', ip);
        }

        const verifyResponse = await fetch(
            'https://challenges.cloudflare.com/turnstile/v0/siteverify',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData.toString(),
            }
        );

        const result = await verifyResponse.json();

        if (result.success) {
            return NextResponse.json({ success: true });
        } else {
            // 不暴露内部错误码，统一返回通用错误
            return NextResponse.json(
                { success: false, error: '人机验证失败，请重试' },
                { status: 403 }
            );
        }
    } catch {
        return NextResponse.json(
            { success: false, error: '验证服务异常' },
            { status: 500 }
        );
    }
}
