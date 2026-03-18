import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware — SEO 域名统一 + 旧域名迁移
 * 1. theone58.com / www.theone58.com → www.ikanpp.com（品牌迁移 301）
 * 2. ikanpp.com（无 www）→ www.ikanpp.com（规范化 301）
 */
export function middleware(request: NextRequest) {
    const host = request.headers.get('host') || '';
    const url = request.nextUrl.clone();

    // 旧域名 theone58.com → 新域名 www.ikanpp.com（301 永久重定向）
    if (host === 'theone58.com' || host === 'www.theone58.com') {
        url.host = 'www.ikanpp.com';
        url.protocol = 'https';
        return NextResponse.redirect(url, 301);
    }

    // 非 www → www 301 重定向
    if (
        host === 'ikanpp.com' &&
        !host.startsWith('localhost') &&
        !host.startsWith('127.0.0.1')
    ) {
        url.host = 'www.ikanpp.com';
        return NextResponse.redirect(url, 301);
    }

    return NextResponse.next();
}

// 仅匹配页面路由，排除静态资源和 API
export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|icon.png|og-image.png|manifest.json|robots.txt|sitemap.xml|api/).*)',
    ],
};
