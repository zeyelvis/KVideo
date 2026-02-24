import type { VideoSource } from '@/lib/types';

// 精选默认视频源 - 支持4K超清 + 东南亚/中国大陆速度友好
export const DEFAULT_SOURCES: VideoSource[] = [
  {
    id: 'suoni',
    name: '索尼资源',
    baseUrl: 'https://suoniapi.com',
    searchPath: '/api.php/provide/vod',
    detailPath: '/api.php/provide/vod',
    group: 'normal',
    enabled: true,
    priority: 1, // 东南亚最快 288ms，13万资源，4K
  },
  {
    id: 'zuida',
    name: '最大资源',
    baseUrl: 'https://api.zuidapi.com',
    searchPath: '/api.php/provide/vod',
    detailPath: '/api.php/provide/vod',
    group: 'normal',
    enabled: true,
    priority: 2, // 443ms，11万资源，4K
  },
  {
    id: 'wujin',
    name: '无尽资源',
    baseUrl: 'https://api.wujinapi.com',
    searchPath: '/api.php/provide/vod',
    detailPath: '/api.php/provide/vod',
    group: 'normal',
    enabled: true,
    priority: 3, // 589ms，10万资源，4K
  },
  {
    id: 'subo',
    name: '速博资源',
    baseUrl: 'https://subocaiji.com',
    searchPath: '/api.php/provide/vod',
    detailPath: '/api.php/provide/vod',
    group: 'normal',
    enabled: true,
    priority: 4, // 850ms，9.7万资源，4K，双线路
  },
  {
    id: 'niuniu',
    name: '牛牛点播',
    baseUrl: 'https://api.niuniuzy.me',
    searchPath: '/api.php/provide/vod',
    detailPath: '/api.php/provide/vod',
    group: 'normal',
    enabled: true,
    priority: 5, // 928ms，11万资源，4K
  },
  {
    id: 'shandian',
    name: '闪电资源',
    baseUrl: 'https://sdzyapi.com',
    searchPath: '/api.php/provide/vod',
    detailPath: '/api.php/provide/vod',
    group: 'normal',
    enabled: true,
    priority: 6, // 965ms，11万资源，4K
  },
  {
    id: 'ruyi',
    name: '如意资源',
    baseUrl: 'https://cj.rycjapi.com',
    searchPath: '/api.php/provide/vod',
    detailPath: '/api.php/provide/vod',
    group: 'normal',
    enabled: true,
    priority: 7, // 1083ms，7万资源，4K，双线路
  },
  {
    id: 'hongniu',
    name: '红牛资源',
    baseUrl: 'https://www.hongniuzy2.com',
    searchPath: '/api.php/provide/vod',
    detailPath: '/api.php/provide/vod',
    group: 'normal',
    enabled: true,
    priority: 8, // 1207ms，9.6万资源，4K，双线路
  },
];
