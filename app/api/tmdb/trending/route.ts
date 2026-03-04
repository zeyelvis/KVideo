import { NextResponse } from 'next/server';

export const runtime = 'edge';

// TMDB API 配置
const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const TMDB_BASE = 'https://api.themoviedb.org/3';

/**
 * 用电影名搜索 TMDB，返回横版 Backdrop 图片 URL
 * GET /api/tmdb/trending?title=流浪地球&lang=zh-CN
 * POST /api/tmdb/trending body: { titles: ["流浪地球", "哪吒"] }
 */

/**
 * 清理标题中的季数、集数等后缀，提高 TMDB 搜索匹配率
 * 例如："七王国的骑士 第一季" → "七王国的骑士"
 *       "鱿鱼游戏 第二季" → "鱿鱼游戏"
 *       "某某剧(2025)" → "某某剧"
 */
function cleanTitle(title: string): string {
    return title
        // 去除中文季数：第一季、第二季、第1季...
        .replace(/\s*第[一二三四五六七八九十\d]+季/, '')
        // 去除英文季数：Season 1、S01...
        .replace(/\s*[Ss](?:eason)?\s*\d+/i, '')
        // 去除括号备注：(2025)、（更新至08集）
        .replace(/\s*[（(][^)）]*[)）]/g, '')
        // 去除集数：更新至XX集、全XX集
        .replace(/\s*(?:更新至|全)\d+集?/, '')
        .trim();
}

// 内部搜索函数（单次搜索）
async function _searchTMDB(query: string, lang: string): Promise<{ full: string; thumb: string } | null> {
    try {
        // 先搜电影
        const url = `${TMDB_BASE}/search/movie?api_key=${TMDB_API_KEY}&language=${lang}&query=${encodeURIComponent(query)}`;
        const res = await fetch(url, {
            headers: { 'Accept': 'application/json' },
            next: { revalidate: 86400 }
        });
        if (res.ok) {
            const data = await res.json();
            const match = (data.results || []).find((r: any) => r.backdrop_path);
            if (match) {
                return {
                    full: `https://image.tmdb.org/t/p/w1280${match.backdrop_path}`,
                    thumb: `https://image.tmdb.org/t/p/w500${match.backdrop_path}`,
                };
            }
        }

        // 再搜电视剧
        const tvUrl = `${TMDB_BASE}/search/tv?api_key=${TMDB_API_KEY}&language=${lang}&query=${encodeURIComponent(query)}`;
        const tvRes = await fetch(tvUrl, {
            headers: { 'Accept': 'application/json' },
            next: { revalidate: 86400 }
        });
        if (tvRes.ok) {
            const tvData = await tvRes.json();
            const tvMatch = (tvData.results || []).find((r: any) => r.backdrop_path);
            if (tvMatch) {
                return {
                    full: `https://image.tmdb.org/t/p/w1280${tvMatch.backdrop_path}`,
                    thumb: `https://image.tmdb.org/t/p/w500${tvMatch.backdrop_path}`,
                };
            }
        }

        return null;
    } catch {
        return null;
    }
}

// 单部影片搜索 → 返回 backdrop（大图 + 缩略图）
// 先用原标题搜索，找不到再用清理后的标题重试
async function searchBackdrop(title: string, lang: string): Promise<{ full: string; thumb: string } | null> {
    // 第一次：用原标题搜索
    const result = await _searchTMDB(title, lang);
    if (result) return result;

    // 第二次：清理标题后重试
    const cleaned = cleanTitle(title);
    if (cleaned !== title && cleaned.length > 0) {
        return _searchTMDB(cleaned, lang);
    }

    return null;
}

// 批量搜索：POST { titles: [...] }
export async function POST(request: Request) {
    if (!TMDB_API_KEY) {
        return NextResponse.json({ error: 'TMDB API Key not configured' }, { status: 500 });
    }

    try {
        const { titles, lang = 'zh-CN' } = await request.json();
        if (!Array.isArray(titles) || titles.length === 0) {
            return NextResponse.json({ backdrops: {} });
        }

        // 并发搜索所有电影的 backdrop
        const results = await Promise.allSettled(
            titles.map(async (title: string) => ({
                title,
                backdrop: await searchBackdrop(title, lang),
            }))
        );

        // 组装为 { "电影名": { full, thumb } } 映射
        const backdrops: Record<string, { full: string; thumb: string } | null> = {};
        results.forEach(r => {
            if (r.status === 'fulfilled' && r.value) {
                backdrops[r.value.title] = r.value.backdrop;
            }
        });

        return NextResponse.json({ backdrops });
    } catch {
        return NextResponse.json({ backdrops: {} }, { status: 500 });
    }
}

// 单个搜索：GET ?title=xxx
export async function GET(request: Request) {
    if (!TMDB_API_KEY) {
        return NextResponse.json({ error: 'TMDB API Key not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title') || '';
    const lang = searchParams.get('lang') || 'zh-CN';

    if (!title) {
        return NextResponse.json({ backdrop: null });
    }

    const result = await searchBackdrop(title, lang);
    return NextResponse.json({ backdrop: result?.full || null, thumb: result?.thumb || null });
}
