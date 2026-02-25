import { settingsStore } from '@/lib/store/settings-store';
import { premiumModeSettingsStore } from '@/lib/store/premium-mode-settings';

export function getSourceName(sourceId: string): string {
  // 优先从用户配置的源列表中查找名称
  if (typeof window !== 'undefined') {
    try {
      const settings = settingsStore.getSettings();
      const allSources = [...(settings.sources || []), ...(settings.premiumSources || [])];
      const found = allSources.find(s => s.id === sourceId);
      if (found?.name) return found.name;

      // 也查 premium store
      const premiumSettings = premiumModeSettingsStore.getSettings();
      const premiumFound = premiumSettings.sources?.find((s: any) => s.id === sourceId);
      if (premiumFound?.name) return premiumFound.name;
    } catch {
      // 静默回退到硬编码映射
    }
  }

  // 硬编码映射兜底（匹配 default-sources.ts 中的 ID）
  const sourceNames: Record<string, string> = {
    'feifan': '非凡资源',
    'wolong': '卧龙资源',
    'zuida': '最大资源',
    'baidu': '百度云资源',
    'baofeng': '暴风资源',
    'jisu': '极速资源',
    'tianya': '天涯资源',
    'wujin': '无尽资源',
    'modu': '魔都资源',
    'zy360': '360资源',
    'dytt': '电影天堂',
    'ruyi': '如意资源',
    'wangwang': '旺旺资源',
    'hongniu': '红牛资源',
    'guangsu': '光速资源',
    'ikun': 'iKun资源',
    'youku': '优酷资源',
    'huya': '虎牙资源',
    'xinlang': '新浪资源',
    'lezi': '乐子资源',
    'haitun': '海豚资源',
    'jingyu': '鲸鱼资源',
    'aidan': '爱蛋资源',
    'moduys': '魔都影视',
    'feifan_api': '非凡API',
    'feifan_cj': '非凡采集',
    'feifan_cj_https': '非凡采集HTTPS',
    'feifan1': '非凡线路1',
    'wolong_cj': '卧龙采集',
    'baofeng_app': '暴风APP',
    'wujin_me': '无尽ME',
    'tianya2': '天涯海角',
    'guangsu_http': '光速HTTP',
    'xinlang_https': '新浪HTTPS',
    'json1080': '1080JSON',
    'lezi_http': '乐子HTTP',
    'youku88': 'U酷资源88',
    'wujin_cc': '无尽CC',
    'yaya': '丫丫点播',
    'wolong_cc': '卧龙CC',
    'wujin_net': '无尽NET',
    'wangwang_api': '旺旺API',
    'zuida_db': '最大点播',
    'yinghua': '樱花资源',
    'bubugao': '步步高资源',
    'niuniu': '牛牛点播',
    'suoni': '索尼资源',
    'maotai': '茅台资源',
    'douban': '豆瓣资源',
    'subo': '速博资源',
    'jinying': '金鹰点播',
    'shandian': '閃電资源',
    'piaoling': '飘零资源',
    'modu_dm': '魔都动漫',
    'hongniu3': '红牛资源3',
    'suoni_sd': '索尼-闪电',
  };
  return sourceNames[sourceId] || sourceId;
}
