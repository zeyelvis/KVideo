#!/usr/bin/env node
/**
 * 视频源带宽质量检测脚本
 * 
 * 测试流程：
 * 1. 搜索 API 响应时间
 * 2. 获取第一个视频的 m3u8 播放地址
 * 3. 解析 m3u8 获取分片列表
 * 4. 下载多个分片测试实际带宽
 * 5. 生成报告
 * 
 * 用法：node scripts/test-sources.mjs
 */

const TEST_QUERY = '你好'; // 搜索关键词（尽量选有结果的）
const SEARCH_TIMEOUT = 10000;    // 搜索超时 10 秒
const SEGMENT_TIMEOUT = 8000;    // 分片下载超时 8 秒
const SEGMENTS_TO_TEST = 3;      // 测试的分片数量
const MIN_BANDWIDTH_KBPS = 500;  // 最低可接受带宽 500 Kbps (会引起卡顿的阈值)

// ── 源列表（从 default-sources.ts 导入） ─────────
const SOURCES = [
  { id: 'feifan', name: '非凡资源', baseUrl: 'http://ffzy5.tv', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
  { id: 'wolong', name: '卧龙资源', baseUrl: 'https://wolongzyw.com', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
  { id: 'zuida', name: '最大资源', baseUrl: 'https://api.zuidapi.com', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
  { id: 'baidu', name: '百度云资源', baseUrl: 'https://api.apibdzy.com', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
  { id: 'baofeng', name: '暴风资源', baseUrl: 'https://bfzyapi.com', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
  { id: 'jisu', name: '极速资源', baseUrl: 'https://jszyapi.com', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
  { id: 'tianya', name: '天涯资源', baseUrl: 'https://tyyszy.com', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
  { id: 'wujin', name: '无尽资源', baseUrl: 'https://api.wujinapi.com', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
  { id: 'modu', name: '魔都资源', baseUrl: 'https://www.mdzyapi.com', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
  { id: 'zy360', name: '360资源', baseUrl: 'https://360zy.com', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
  { id: 'dytt', name: '电影天堂', baseUrl: 'http://caiji.dyttzyapi.com', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
  { id: 'ruyi', name: '如意资源', baseUrl: 'https://cj.rycjapi.com', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
  { id: 'wangwang', name: '旺旺资源', baseUrl: 'https://wwzy.tv', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
  { id: 'hongniu', name: '红牛资源', baseUrl: 'https://www.hongniuzy2.com', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
  { id: 'guangsu', name: '光速资源', baseUrl: 'https://api.guangsuapi.com', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
  { id: 'ikun', name: 'iKun资源', baseUrl: 'https://ikunzyapi.com', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
  { id: 'youku', name: '优酷资源', baseUrl: 'https://api.ukuapi.com', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
  { id: 'huya', name: '虎牙资源', baseUrl: 'https://www.huyaapi.com', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
  { id: 'xinlang', name: '新浪资源', baseUrl: 'http://api.xinlangapi.com', searchPath: '/xinlangapi.php/provide/vod', detailPath: '/xinlangapi.php/provide/vod' },
  { id: 'lezi', name: '乐子资源', baseUrl: 'https://cj.lziapi.com', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
  { id: 'haitun', name: '海豚资源', baseUrl: 'https://hhzyapi.com', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
  { id: 'jingyu', name: '鲸鱼资源', baseUrl: 'https://jyzyapi.com', searchPath: '/provide/vod', detailPath: '/provide/vod' },
  { id: 'aidan', name: '爱蛋资源', baseUrl: 'https://lovedan.net', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
  { id: 'moduys', name: '魔都影视', baseUrl: 'https://www.moduzy.com', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
  { id: 'feifan_api', name: '非凡API', baseUrl: 'https://api.ffzyapi.com', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
  { id: 'feifan_cj', name: '非凡采集', baseUrl: 'http://cj.ffzyapi.com', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
  { id: 'feifan_cj_https', name: '非凡采集HTTPS', baseUrl: 'https://cj.ffzyapi.com', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
  { id: 'feifan1', name: '非凡线路1', baseUrl: 'http://ffzy1.tv', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
  { id: 'wolong_cj', name: '卧龙采集', baseUrl: 'https://collect.wolongzyw.com', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
  { id: 'baofeng_app', name: '暴风APP', baseUrl: 'https://app.bfzyapi.com', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
  { id: 'wujin_me', name: '无尽ME', baseUrl: 'https://api.wujinapi.me', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
  { id: 'tianya2', name: '天涯海角', baseUrl: 'https://tyyszyapi.com', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
  { id: 'guangsu_http', name: '光速HTTP', baseUrl: 'http://api.guangsuapi.com', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
  { id: 'xinlang_https', name: '新浪HTTPS', baseUrl: 'https://api.xinlangapi.com', searchPath: '/xinlangapi.php/provide/vod', detailPath: '/xinlangapi.php/provide/vod' },
  { id: 'json1080', name: '1080JSON', baseUrl: 'https://api.1080zyku.com', searchPath: '/inc/apijson.php', detailPath: '/inc/apijson.php' },
  { id: 'lezi_http', name: '乐子HTTP', baseUrl: 'http://cj.lziapi.com', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
  { id: 'youku88', name: 'U酷资源88', baseUrl: 'https://api.ukuapi88.com', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
  { id: 'wujin_cc', name: '无尽CC', baseUrl: 'https://api.wujinapi.cc', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
  { id: 'yaya', name: '丫丫点播', baseUrl: 'https://cj.yayazy.net', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
  { id: 'wolong_cc', name: '卧龙CC', baseUrl: 'https://collect.wolongzy.cc', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
  { id: 'wujin_net', name: '无尽NET', baseUrl: 'https://api.wujinapi.net', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
  { id: 'wangwang_api', name: '旺旺API', baseUrl: 'https://api.wwzy.tv', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
  { id: 'zuida_db', name: '最大点播', baseUrl: 'http://zuidazy.me', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
  { id: 'yinghua', name: '樱花资源', baseUrl: 'https://m3u8.apiyhzy.com', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
  { id: 'bubugao', name: '步步高资源', baseUrl: 'https://api.yparse.com', searchPath: '/api/json', detailPath: '/api/json' },
  { id: 'niuniu', name: '牛牛点播', baseUrl: 'https://api.niuniuzy.me', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
  { id: 'suoni', name: '索尼资源', baseUrl: 'https://suoniapi.com', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
  { id: 'maotai', name: '茅台资源', baseUrl: 'https://caiji.maotaizy.cc', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
  { id: 'douban_src', name: '豆瓣资源', baseUrl: 'https://dbzy.tv', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
  { id: 'subo', name: '速博资源', baseUrl: 'https://subocaiji.com', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
  { id: 'jinying', name: '金鹰点播', baseUrl: 'https://jinyingzy.com', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
  { id: 'shandian', name: '閃電资源', baseUrl: 'https://sdzyapi.com', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
  { id: 'piaoling', name: '飘零资源', baseUrl: 'https://p2100.net', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
  { id: 'modu_dm', name: '魔都动漫', baseUrl: 'https://caiji.moduapi.cc', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
  { id: 'hongniu3', name: '红牛资源3', baseUrl: 'https://www.hongniuzy3.com', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
  { id: 'suoni_sd', name: '索尼-闪电', baseUrl: 'https://xsd.sdzyapi.com', searchPath: '/api.php/provide/vod', detailPath: '/api.php/provide/vod' },
];

// ── 工具函数 ────────────────────────────────────
async function fetchWithTimeout(url, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// ── 测试单个源 ──────────────────────────────────
async function testSource(source) {
  const result = {
    id: source.id,
    name: source.name,
    searchMs: null,
    videoFound: false,
    m3u8Url: null,
    segmentCount: null,
    avgSegmentMs: null,
    avgBandwidthKbps: null,
    minBandwidthKbps: null,
    verdict: '❓ 未测试',
  };

  // Step 1: 搜索
  const searchStart = Date.now();
  try {
    const url = `${source.baseUrl}${source.searchPath}?ac=detail&wd=${encodeURIComponent(TEST_QUERY)}`;
    const res = await fetchWithTimeout(url, SEARCH_TIMEOUT);
    result.searchMs = Date.now() - searchStart;
    
    if (!res.ok) {
      result.verdict = '❌ 搜索失败 (HTTP ' + res.status + ')';
      return result;
    }

    const data = await res.json();
    const list = data.list || [];

    if (list.length === 0) {
      result.verdict = '⚠️ 搜索无结果';
      return result;
    }

    result.videoFound = true;

    // Step 2: 获取 m3u8 地址
    const video = list[0];
    const playFrom = (video.vod_play_from || '').split('$$$');
    const playUrls = (video.vod_play_url || '').split('$$$');

    // 找 m3u8 源
    let m3u8Url = null;
    for (let i = 0; i < playFrom.length; i++) {
      if (playFrom[i].toLowerCase().includes('m3u8') && playUrls[i]?.trim()) {
        // 解析第一集
        const episodes = playUrls[i].split('#');
        if (episodes.length > 0) {
          const parts = episodes[0].split('$');
          m3u8Url = parts.length > 1 ? parts[1] : parts[0];
        }
        break;
      }
    }

    // 降级：非 m3u8 也试试
    if (!m3u8Url) {
      for (let i = 0; i < playUrls.length; i++) {
        if (playUrls[i]?.trim()) {
          const episodes = playUrls[i].split('#');
          if (episodes.length > 0) {
            const parts = episodes[0].split('$');
            m3u8Url = parts.length > 1 ? parts[1] : parts[0];
          }
          break;
        }
      }
    }

    if (!m3u8Url || !m3u8Url.startsWith('http')) {
      result.verdict = '⚠️ 无有效播放地址';
      return result;
    }

    result.m3u8Url = m3u8Url;

    // Step 3: 下载并解析 m3u8
    const m3u8Res = await fetchWithTimeout(m3u8Url, SEGMENT_TIMEOUT);
    if (!m3u8Res.ok) {
      result.verdict = '❌ m3u8 不可访问';
      return result;
    }

    const m3u8Text = await m3u8Res.text();
    
    // 解析分片 URL
    const lines = m3u8Text.split('\n');
    const segmentUrls = [];
    const baseM3u8 = m3u8Url.substring(0, m3u8Url.lastIndexOf('/') + 1);

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const segUrl = trimmed.startsWith('http') ? trimmed : baseM3u8 + trimmed;
        segmentUrls.push(segUrl);
      }
    }

    // 如果是嵌套 m3u8（多码率），解析第一个子 m3u8
    if (segmentUrls.length > 0 && segmentUrls[0].endsWith('.m3u8')) {
      try {
        const subRes = await fetchWithTimeout(segmentUrls[0], SEGMENT_TIMEOUT);
        if (subRes.ok) {
          const subText = await subRes.text();
          const subLines = subText.split('\n');
          const subBase = segmentUrls[0].substring(0, segmentUrls[0].lastIndexOf('/') + 1);
          segmentUrls.length = 0;
          for (const sl of subLines) {
            const t = sl.trim();
            if (t && !t.startsWith('#')) {
              segmentUrls.push(t.startsWith('http') ? t : subBase + t);
            }
          }
        }
      } catch {}
    }

    result.segmentCount = segmentUrls.length;

    if (segmentUrls.length === 0) {
      result.verdict = '⚠️ m3u8 无分片';
      return result;
    }

    // Step 4: 下载分片测速
    // 选取前/中/后各一个分片测试
    const indicesToTest = [];
    indicesToTest.push(0); // 第一个
    if (segmentUrls.length > 2) indicesToTest.push(Math.floor(segmentUrls.length / 2)); // 中间
    if (segmentUrls.length > 4) indicesToTest.push(Math.min(segmentUrls.length - 1, Math.floor(segmentUrls.length * 0.8))); // 80%位置

    const bandwidths = [];
    const segTimes = [];

    for (const idx of indicesToTest) {
      const segUrl = segmentUrls[idx];
      const segStart = Date.now();
      try {
        const segRes = await fetchWithTimeout(segUrl, SEGMENT_TIMEOUT);
        if (!segRes.ok) continue;
        
        const buf = await segRes.arrayBuffer();
        const segMs = Date.now() - segStart;
        const sizeKb = buf.byteLength / 1024;
        const bwKbps = (sizeKb * 8) / (segMs / 1000); // Kbps

        segTimes.push(segMs);
        bandwidths.push(bwKbps);
      } catch {
        segTimes.push(SEGMENT_TIMEOUT);
        bandwidths.push(0);
      }
    }

    if (bandwidths.length === 0 || bandwidths.every(b => b === 0)) {
      result.verdict = '❌ 分片下载失败';
      return result;
    }

    result.avgSegmentMs = Math.round(segTimes.reduce((a, b) => a + b, 0) / segTimes.length);
    result.avgBandwidthKbps = Math.round(bandwidths.reduce((a, b) => a + b, 0) / bandwidths.length);
    result.minBandwidthKbps = Math.round(Math.min(...bandwidths.filter(b => b > 0)));

    // 判定
    if (result.minBandwidthKbps >= 2000) {
      result.verdict = '✅ 优秀 (>2Mbps)';
    } else if (result.minBandwidthKbps >= MIN_BANDWIDTH_KBPS) {
      result.verdict = '✅ 正常';
    } else if (result.minBandwidthKbps > 0) {
      result.verdict = '⚠️ 带宽不足 (可能卡顿)';
    } else {
      result.verdict = '❌ 极慢';
    }

  } catch (err) {
    result.searchMs = Date.now() - searchStart;
    if (err.name === 'AbortError') {
      result.verdict = '❌ 超时';
    } else {
      result.verdict = '❌ 错误: ' + (err.message || '未知').substring(0, 50);
    }
  }

  return result;
}

// ── 主入口 ──────────────────────────────────────
async function main() {
  console.log('='.repeat(80));
  console.log('  视频源带宽质量检测');
  console.log(`  搜索词: "${TEST_QUERY}"  |  最低带宽: ${MIN_BANDWIDTH_KBPS} Kbps  |  测试分片: ${SEGMENTS_TO_TEST}`);
  console.log('='.repeat(80));
  console.log('');

  const results = [];
  const batchSize = 5; // 每批 5 个并发

  for (let i = 0; i < SOURCES.length; i += batchSize) {
    const batch = SOURCES.slice(i, i + batchSize);
    console.log(`[${i + 1}-${Math.min(i + batchSize, SOURCES.length)}/${SOURCES.length}] 正在测试: ${batch.map(s => s.name).join(', ')}`);
    
    const batchResults = await Promise.all(batch.map(s => testSource(s)));
    results.push(...batchResults);

    for (const r of batchResults) {
      const bw = r.avgBandwidthKbps ? `${r.avgBandwidthKbps} Kbps` : '-';
      const search = r.searchMs !== null ? `${r.searchMs}ms` : '-';
      console.log(`  ${r.verdict}  ${r.name.padEnd(14)} | 搜索: ${search.padEnd(8)} | 带宽: ${bw.padEnd(12)} | 分片: ${r.segmentCount || '-'}`);
    }
    console.log('');
  }

  // ── 生成汇总报告 ──────────────────────────────
  console.log('='.repeat(80));
  console.log('  汇总报告');
  console.log('='.repeat(80));

  const excellent = results.filter(r => r.verdict.includes('优秀'));
  const normal = results.filter(r => r.verdict === '✅ 正常');
  const slow = results.filter(r => r.verdict.includes('带宽不足'));
  const failed = results.filter(r => r.verdict.startsWith('❌'));
  const noResult = results.filter(r => r.verdict.startsWith('⚠️'));

  console.log(`\n✅ 优秀 (${excellent.length}): ${excellent.map(r => r.name).join(', ') || '无'}`);
  console.log(`✅ 正常 (${normal.length}): ${normal.map(r => r.name).join(', ') || '无'}`);
  console.log(`⚠️ 慢速 (${slow.length}): ${slow.map(r => r.name).join(', ') || '无'}`);
  console.log(`⚠️ 无结果 (${noResult.length}): ${noResult.map(r => r.name).join(', ') || '无'}`);
  console.log(`❌ 失败 (${failed.length}): ${failed.map(r => r.name).join(', ') || '无'}`);

  // 建议禁用列表
  const toDisable = [...slow, ...failed];
  if (toDisable.length > 0) {
    console.log(`\n🚫 建议禁用的源 (${toDisable.length}):`);
    for (const r of toDisable) {
      console.log(`  - '${r.id}' // ${r.name} — ${r.verdict}`);
    }
  }

  console.log(`\n总计: ${results.length} 源 | 可用: ${excellent.length + normal.length} | 问题: ${slow.length + failed.length + noResult.length}`);
}

main().catch(console.error);
