'use client';

/**
 * VipPrompt — VIP 开通引导组件
 * 深色渐变背景 + 金色 VIP 主题
 * 可作为弹窗或页面嵌入使用
 */
import { useState } from 'react';
import { Crown, Sparkles, Film, Search, Cloud, Gift, Copy, Check, LogIn, X } from 'lucide-react';
import { useUserStore } from '@/lib/store/user-store';

interface VipPromptProps {
    /** 弹窗模式：显示关闭按钮 */
    asModal?: boolean;
    /** 关闭回调 */
    onClose?: () => void;
    /** 打开登录弹窗 */
    onOpenLogin?: () => void;
}

// VIP 特权列表
const VIP_BENEFITS = [
    { icon: Film, label: '解锁午夜版专属内容', color: 'text-purple-400' },
    { icon: Search, label: '全网影视 Premium 搜索', color: 'text-blue-400' },
    { icon: Cloud, label: '收藏 · 历史 · 云同步', color: 'text-cyan-400' },
    { icon: Sparkles, label: '高清画质优先加载', color: 'text-amber-400' },
    { icon: Gift, label: '邀请好友赚更多 VIP', color: 'text-rose-400' },
];

export function VipPrompt({ asModal = false, onClose, onOpenLogin }: VipPromptProps) {
    const { user } = useUserStore();
    const [copied, setCopied] = useState(false);

    const isLoggedIn = !!user;
    const isVip = user?.isVip ?? false;
    const inviteCode = user?.inviteCode;

    // 复制邀请链接
    const handleCopyInvite = async () => {
        if (!inviteCode) return;
        const link = `${window.location.origin}?ref=${inviteCode}`;
        try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // 降级方案
            const ta = document.createElement('textarea');
            ta.value = link;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // VIP 到期时间
    const vipExpiry = user?.vipUntil
        ? new Date(user.vipUntil).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
        : null;

    return (
        <div className={`relative ${asModal ? '' : 'min-h-[70vh]'} flex items-center justify-center`}>
            {/* 背景 — 完全不透明，避免弹窗穿透 */}
            <div className="absolute inset-0 rounded-2xl overflow-hidden" style={{
                background: 'linear-gradient(135deg, #0f0c29 0%, #1a1040 30%, #302b63 60%, #24243e 100%)',
            }}>
                {/* 装饰光斑 */}
                <div className="absolute top-10 right-10 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px]" />
                <div className="absolute bottom-10 left-10 w-48 h-48 bg-purple-500/10 rounded-full blur-[60px]" />
            </div>

            {/* 内容卡片 */}
            <div className="relative z-10 w-full max-w-lg mx-auto p-8 md:p-10">
                {/* 关闭按钮（弹窗模式） */}
                {asModal && onClose && (
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                )}

                {/* VIP 皇冠 */}
                <div className="flex justify-center mb-6">
                    <div className="relative">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                            <Crown size={36} className="text-white drop-shadow-lg" />
                        </div>
                        {/* 光环脉动 */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 animate-ping opacity-20" />
                    </div>
                </div>

                {/* 标题 */}
                <h2 className="text-center text-2xl font-bold text-white mb-1">
                    开通 <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400">VIP</span> 会员
                </h2>
                <p className="text-center text-white/50 text-sm mb-8">
                    {isVip
                        ? `你的 VIP 有效期至 ${vipExpiry}`
                        : '解锁全部高级功能，畅享极致体验'
                    }
                </p>

                {/* 特权列表 */}
                <div className="space-y-3 mb-8">
                    {VIP_BENEFITS.map((item, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/8 transition-colors"
                        >
                            <div className={`p-2 rounded-lg bg-white/5 ${item.color}`}>
                                <item.icon size={18} />
                            </div>
                            <span className="text-white/80 text-sm font-medium">{item.label}</span>
                            <Check size={14} className="ml-auto text-emerald-400/60" />
                        </div>
                    ))}
                </div>

                {/* 操作按钮 */}
                <div className="space-y-3">
                    {isLoggedIn ? (
                        <>
                            {/* 已登录：复制邀请链接获取 VIP */}
                            <button
                                onClick={handleCopyInvite}
                                className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer
                                    bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25
                                    hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {copied ? (
                                    <>
                                        <Check size={16} />
                                        已复制邀请链接！
                                    </>
                                ) : (
                                    <>
                                        <Copy size={16} />
                                        分享邀请码获取 VIP 天数
                                    </>
                                )}
                            </button>

                            {inviteCode && (
                                <p className="text-center text-white/30 text-xs">
                                    你的邀请码：<span className="text-amber-400/80 font-mono">{inviteCode}</span>
                                    {'  '}·{'  '}每邀请 1 人注册 +1 天 VIP
                                </p>
                            )}
                        </>
                    ) : (
                        <>
                            {/* 未登录：引导登录/注册 */}
                            <button
                                onClick={onOpenLogin}
                                className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer
                                    bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25
                                    hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <LogIn size={16} />
                                登录 / 注册
                            </button>
                            <p className="text-center text-white/30 text-xs">
                                注册即送 <span className="text-amber-400/80">30 天 VIP</span> 体验
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
