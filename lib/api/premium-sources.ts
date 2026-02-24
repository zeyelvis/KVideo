import type { VideoSource } from '@/lib/types';

// 高级模式视频源 (Premium / 18+)
export const PREMIUM_SOURCES: VideoSource[] = [
    {
        id: 'hsck',
        name: '花生壳资源',
        baseUrl: 'https://hsckzy888.com',
        searchPath: '/api.php/provide/vod',
        detailPath: '/api.php/provide/vod',
        group: 'premium',
        enabled: true,
        priority: 1,
    },
    {
        id: 'wsy',
        name: '微视云资源',
        baseUrl: 'https://api.wsyzy.net',
        searchPath: '/api.php/provide/vod',
        detailPath: '/api.php/provide/vod',
        group: 'premium',
        enabled: true,
        priority: 2,
    },
    {
        id: '19q',
        name: '19Q资源',
        baseUrl: 'https://19q.cc',
        searchPath: '/api.php/provide/vod',
        detailPath: '/api.php/provide/vod',
        group: 'premium',
        enabled: true,
        priority: 3,
    },
];
