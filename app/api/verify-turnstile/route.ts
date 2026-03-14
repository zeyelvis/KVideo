/**
 * Turnstile 服务端验证 API
 * 验证前端传来的 Turnstile token 是否有效
 */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA'; // 测试密钥
const TURNSTILE_TEST_SECRET_KEY = '1x0000000000000000000000000000000AA'; // Cloudflare 官方测试密钥

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: '缺少验证 token' },
        { status: 400 }
      );
    }

    // 本地开发环境使用测试密钥（与前端测试 site key 配对）
    const referer = request.headers.get('referer') || '';
    const isLocal = referer.includes('localhost') || referer.includes('127.0.0.1');
    const secretKey = isLocal ? TURNSTILE_TEST_SECRET_KEY : TURNSTILE_SECRET_KEY;

    // 调用 Cloudflare Turnstile 验证 API
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);

    // 获取客户端 IP
    const ip = request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') || '';
    
    if (ip) {
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
      return NextResponse.json(
        { success: false, error: '人机验证失败，请重试', codes: result['error-codes'] },
        { status: 403 }
      );
    }
  } catch (error) {
    console.error('Turnstile 验证错误:', error);
    return NextResponse.json(
      { success: false, error: '验证服务异常' },
      { status: 500 }
    );
  }
}
