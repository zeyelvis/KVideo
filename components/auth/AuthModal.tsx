/**
 * AuthModal — 专业级登录/注册弹窗
 * 安全：邮箱严格校验 + 一次性邮箱拦截 + 密码强度策略 + 弱密码黑名单
 * 体验：实时输入反馈 + 密码强度指示器 + 独立字段错误提示
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Mail, Lock, Gift, Eye, EyeOff, Loader2, Crown, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useUserStore } from '@/lib/store/user-store';
import { Turnstile } from '@/components/auth/Turnstile';

// ─── 安全常量 ────────────────────────────────

/** 一次性/临时邮箱域名黑名单 */
const DISPOSABLE_EMAIL_DOMAINS = new Set([
    'tempmail.com', 'guerrillamail.com', 'mailinator.com', 'throwaway.email',
    'temp-mail.org', 'fakeinbox.com', 'sharklasers.com', 'guerrillamailblock.com',
    'grr.la', 'guerrillamail.info', 'guerrillamail.net', 'guerrillamail.org',
    'guerrillamail.de', 'yopmail.com', 'yopmail.fr', 'trashmail.com',
    'trashmail.net', 'disposable.email', 'mailnesia.com', 'maildrop.cc',
    'dispostable.com', 'getnada.com', 'tempail.com', 'mohmal.com',
    'minutemail.com', '10minutemail.com', 'tempr.email', 'discard.email',
    'tmpmail.net', 'tmpmail.org', 'burnermail.io', 'mailsac.com',
    'harakirimail.com', 'tmail.ws', 'ethereal.email',
]);

/** 常见弱密码黑名单 */
const COMMON_WEAK_PASSWORDS = new Set([
    'password', 'password1', 'password123', '12345678', '123456789',
    '1234567890', 'qwerty123', 'abc12345', 'abcd1234', 'admin123',
    'letmein01', 'welcome1', 'monkey123', 'dragon123', 'master123',
    'qwertyui', 'iloveyou', 'trustno1', 'sunshine1', 'princess1',
]);

// ─── 校验工具函数 ──────────────────────────────

/** 邮箱格式校验 + 一次性邮箱拦截 */
function validateEmail(email: string): { valid: boolean; error?: string } {
    if (!email) return { valid: false, error: '请输入邮箱地址' };
    // 仅允许标准 ASCII 邮箱
    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) return { valid: false, error: '邮箱格式不正确' };
    // 禁止一次性邮箱
    const domain = email.split('@')[1]?.toLowerCase();
    if (domain && DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
        return { valid: false, error: '不支持临时邮箱，请使用常用邮箱注册' };
    }
    return { valid: true };
}

/** 密码合法性校验（注册专用） */
function validatePassword(password: string): { valid: boolean; error?: string } {
    if (!password) return { valid: false, error: '请输入密码' };
    if (password.length < 8) return { valid: false, error: '密码至少 8 位' };
    if (password.length > 64) return { valid: false, error: '密码不能超过 64 位' };
    // 仅 ASCII 可打印字符
    if (!/^[\x20-\x7E]+$/.test(password)) {
        return { valid: false, error: '密码只能包含英文字母、数字和符号' };
    }
    if (!/[a-z]/.test(password)) return { valid: false, error: '密码需包含至少一个小写字母' };
    if (!/[A-Z]/.test(password)) return { valid: false, error: '密码需包含至少一个大写字母' };
    if (!/[0-9]/.test(password)) return { valid: false, error: '密码需包含至少一个数字' };
    if (COMMON_WEAK_PASSWORDS.has(password.toLowerCase())) {
        return { valid: false, error: '密码过于简单，请使用更复杂的密码' };
    }
    return { valid: true };
}

/** 密码强度等级：0 弱, 1 一般, 2 强, 3 非常强 */
function getPasswordStrength(password: string): { level: number; label: string; color: string } {
    if (!password || password.length < 4) return { level: 0, label: '弱', color: '#ef4444' };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    if (password.length >= 16) score++;

    if (score <= 2) return { level: 0, label: '弱', color: '#ef4444' };
    if (score === 3) return { level: 1, label: '一般', color: '#f59e0b' };
    if (score === 4) return { level: 2, label: '强', color: '#3b82f6' };
    return { level: 3, label: '非常强', color: '#10b981' };
}

// ─── 组件 ──────────────────────────────────

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    defaultTab?: 'login' | 'register';
}

export function AuthModal({ isOpen, onClose, defaultTab = 'login' }: AuthModalProps) {
    const [tab, setTab] = useState<'login' | 'register'>(defaultTab);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [referralCode, setReferralCode] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [turnstileToken, setTurnstileToken] = useState('');
    const [agreed, setAgreed] = useState(true);

    // 实时校验状态
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [confirmError, setConfirmError] = useState('');
    const [passwordStrength, setPasswordStrength] = useState({ level: 0, label: '弱', color: '#ef4444' });
    const [emailTouched, setEmailTouched] = useState(false);
    const [passwordTouched, setPasswordTouched] = useState(false);
    const [confirmTouched, setConfirmTouched] = useState(false);

    const { login, register, loading } = useUserStore();

    // 从 URL 或 localStorage 读取邀请码
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const ref = params.get('ref');
            if (ref) {
                setReferralCode(ref.toUpperCase());
                setTab('register');
            } else {
                const stored = localStorage.getItem('kvideo-referral-code');
                if (stored) {
                    setReferralCode(stored);
                    setTab('register');
                }
            }
        }
    }, []);

    useEffect(() => { setTab(defaultTab); }, [defaultTab]);

    const resetForm = () => {
        setEmail(''); setPassword(''); setConfirmPassword('');
        setError(''); setSuccess('');
        setEmailError(''); setPasswordError(''); setConfirmError('');
        setEmailTouched(false); setPasswordTouched(false); setConfirmTouched(false);
        setPasswordStrength({ level: 0, label: '弱', color: '#ef4444' });
    };

    // ─── 实时校验 handlers ──────────

    const handleEmailChange = useCallback((value: string) => {
        // 自动去除空格并转小写
        const cleaned = value.replace(/\s/g, '').toLowerCase();
        setEmail(cleaned);
        if (emailTouched && cleaned) {
            const result = validateEmail(cleaned);
            setEmailError(result.valid ? '' : (result.error || ''));
        } else if (!cleaned) {
            setEmailError('');
        }
    }, [emailTouched]);

    const handleEmailBlur = useCallback(() => {
        setEmailTouched(true);
        if (email) {
            const result = validateEmail(email);
            setEmailError(result.valid ? '' : (result.error || ''));
        }
    }, [email]);

    const handlePasswordChange = useCallback((value: string) => {
        setPassword(value);
        // 实时强度计算
        setPasswordStrength(getPasswordStrength(value));
        // 注册模式下实时校验
        if (tab === 'register' && passwordTouched && value) {
            const result = validatePassword(value);
            setPasswordError(result.valid ? '' : (result.error || ''));
        } else if (!value) {
            setPasswordError('');
        }
        // 确认密码同步校验
        if (confirmTouched && confirmPassword && value !== confirmPassword) {
            setConfirmError('两次密码不一致');
        } else if (confirmPassword && value === confirmPassword) {
            setConfirmError('');
        }
    }, [tab, passwordTouched, confirmTouched, confirmPassword]);

    const handlePasswordBlur = useCallback(() => {
        setPasswordTouched(true);
        if (tab === 'register' && password) {
            const result = validatePassword(password);
            setPasswordError(result.valid ? '' : (result.error || ''));
        }
    }, [tab, password]);

    const handleConfirmChange = useCallback((value: string) => {
        setConfirmPassword(value);
        setConfirmTouched(true);
        if (value && password !== value) {
            setConfirmError('两次密码不一致');
        } else {
            setConfirmError('');
        }
    }, [password]);

    // ─── Turnstile ──────────

    const verifyTurnstile = async (): Promise<boolean> => {
        if (!turnstileToken) {
            setError('请完成人机验证');
            return false;
        }
        try {
            const res = await fetch('/api/verify-turnstile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: turnstileToken }),
            });
            const data = await res.json();
            if (!data.success) {
                setError(data.error || '人机验证失败，请重试');
                setTurnstileToken('');
                return false;
            }
            return true;
        } catch {
            setError('验证服务异常，请稍后重试');
            return false;
        }
    };

    // ─── 登录 ──────────

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!email || !password) { setError('请填写邮箱和密码'); return; }
        // 登录也校验邮箱格式
        const emailResult = validateEmail(email);
        if (!emailResult.valid) { setEmailError(emailResult.error || ''); return; }
        const verified = await verifyTurnstile();
        if (!verified) return;
        try {
            await login(email, password);
            onClose();
            resetForm();
        } catch (err: any) {
            setTurnstileToken('');
            setError(err.message === 'Invalid login credentials' ? '邮箱或密码错误' : err.message || '登录失败');
        }
    };

    // ─── 注册 ──────────

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // 全量前端校验
        const emailResult = validateEmail(email);
        if (!emailResult.valid) { setEmailError(emailResult.error || ''); return; }

        const pwResult = validatePassword(password);
        if (!pwResult.valid) { setPasswordError(pwResult.error || ''); return; }

        if (password !== confirmPassword) { setConfirmError('两次密码不一致'); return; }
        if (!agreed) { setError('请先同意用户协议'); return; }

        const verified = await verifyTurnstile();
        if (!verified) return;

        try {
            await register(email, password, referralCode || undefined);
            if (typeof window !== 'undefined') {
                localStorage.setItem('kvideo-just-registered', 'true');
            }
            const { user: currentUser } = useUserStore.getState();
            if (currentUser) {
                setSuccess('🎉 注册成功！已自动登录，欢迎使用');
                setTimeout(() => { onClose(); resetForm(); }, 2000);
            } else {
                setSuccess('🎉 注册成功！请查收邮箱完成认证后登录');
                setTimeout(() => { onClose(); resetForm(); }, 3000);
            }
        } catch (err: any) {
            setTurnstileToken('');
            if (err.message?.includes('already registered')) {
                setError('该邮箱已注册，请直接登录');
            } else {
                setError(err.message || '注册失败');
            }
        }
    };

    if (!isOpen) return null;

    const isRegister = tab === 'register';

    return createPortal(
        <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
            {/* 背景遮罩 */}
            <div className="fixed inset-0 bg-black/70" onClick={onClose} />

            {/* 弹窗主体 */}
            <div className="relative w-full max-w-[820px] flex rounded-2xl overflow-hidden shadow-2xl"
                style={{ maxHeight: '90vh' }}>

                {/* ===== 左侧宣传区 ===== */}
                <div className="hidden md:flex w-[340px] shrink-0 flex-col justify-between relative overflow-hidden"
                    style={{
                        background: 'linear-gradient(135deg, #0f0c29 0%, #1a1040 30%, #302b63 60%, #24243e 100%)',
                    }}>
                    <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-20"
                        style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.6) 0%, transparent 70%)' }} />
                    <div className="absolute bottom-20 left-0 w-64 h-64 rounded-full opacity-15"
                        style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.6) 0%, transparent 70%)' }} />

                    <div className="p-8">
                        <div className="text-xl font-bold text-white tracking-wide" style={{
                            background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}>theone58</div>
                        <p className="text-xs text-white/40 mt-1">全网 VIP · 免费畅看 · 极速搜播</p>
                    </div>

                    <div className="px-8 flex-1 flex flex-col justify-center">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                                style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(245,158,11,0.1))' }}>
                                <Crown size={24} className="text-amber-400" />
                            </div>
                            <div>
                                <p className="text-white font-semibold text-lg">解锁专属特权</p>
                                <p className="text-white/50 text-xs">登录享会员专属内容</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            {[
                                { icon: '🎬', text: '全网影视免费聚合搜索' },
                                { icon: '👑', text: 'VIP 专属 Premium 内容' },
                                { icon: '☁️', text: '收藏 · 历史 · 云同步' },
                                { icon: '🎁', text: '邀请好友赚 VIP 天数' },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <span className="text-lg">{item.icon}</span>
                                    <span className="text-white/70 text-sm">{item.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-8">
                        <p className="text-white font-bold text-xl leading-snug">
                            注册即送<br />
                            <span className="text-amber-400">30 天 VIP 体验</span>
                        </p>
                        <p className="text-white/40 text-xs mt-2">新用户专属福利</p>
                    </div>
                </div>

                {/* ===== 右侧表单区 ===== */}
                <div className="flex-1 bg-[#1a1a2e] flex flex-col overflow-y-auto" style={{ maxHeight: '90vh', willChange: 'transform' }}>
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-all cursor-pointer z-10"
                    >
                        <X size={18} />
                    </button>

                    {/* 手机端标题 */}
                    <div className="md:hidden p-6 pb-0">
                        <div className="text-xl font-bold text-white tracking-wide" style={{
                            background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}>theone58</div>
                        <p className="text-xs text-white/40 mt-1">注册即送 30 天 VIP 体验</p>
                    </div>

                    {/* Tab 切换 */}
                    <div className="flex items-center gap-6 px-6 md:px-10 pt-8 md:pt-10">
                        <button
                            onClick={() => { setTab('login'); setError(''); setSuccess(''); setEmailError(''); setPasswordError(''); setConfirmError(''); }}
                            className={`relative pb-3 text-sm font-medium transition-colors cursor-pointer ${tab === 'login' ? 'text-white' : 'text-white/40 hover:text-white/60'}`}
                        >
                            密码登录
                            {tab === 'login' && (
                                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-emerald-400" />
                            )}
                        </button>
                        <button
                            onClick={() => { setTab('register'); setError(''); setSuccess(''); setEmailError(''); setPasswordError(''); setConfirmError(''); }}
                            className={`relative pb-3 text-sm font-medium transition-colors cursor-pointer ${tab === 'register' ? 'text-white' : 'text-white/40 hover:text-white/60'}`}
                        >
                            注册账号
                            {tab === 'register' && (
                                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-emerald-400" />
                            )}
                        </button>
                    </div>

                    {/* 表单 */}
                    <form onSubmit={tab === 'login' ? handleLogin : handleRegister}
                        className="flex-1 flex flex-col px-6 md:px-10 pt-6 pb-6">
                        <div className="flex-1 space-y-3 min-h-[260px]">

                            {/* 邮箱 */}
                            <div>
                                <div className="relative group">
                                    <Mail size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${emailError ? 'text-red-400' : 'text-white/30 group-focus-within:text-emerald-400'}`} />
                                    <input
                                        type="email"
                                        placeholder="请输入邮箱地址"
                                        value={email}
                                        onChange={(e) => handleEmailChange(e.target.value)}
                                        onBlur={handleEmailBlur}
                                        className={`w-full pl-11 pr-4 py-3.5 bg-white/5 border rounded-xl text-sm text-white placeholder:text-white/25 focus:outline-none transition-all ${emailError ? 'border-red-500/50 focus:border-red-500/70' : 'border-white/10 focus:border-emerald-400/50 focus:bg-white/8'}`}
                                        autoComplete="email"
                                        autoCorrect="off"
                                        autoCapitalize="off"
                                        spellCheck={false}
                                    />
                                    {/* 邮箱校验状态图标 */}
                                    {emailTouched && email && (
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2">
                                            {emailError
                                                ? <AlertCircle size={14} className="text-red-400" />
                                                : <CheckCircle2 size={14} className="text-emerald-400" />}
                                        </span>
                                    )}
                                </div>
                                {emailError && (
                                    <p className="text-xs text-red-400 mt-1.5 ml-1 flex items-center gap-1">
                                        <AlertCircle size={11} /> {emailError}
                                    </p>
                                )}
                            </div>

                            {/* 密码 */}
                            <div>
                                <div className="relative group">
                                    <Lock size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${passwordError ? 'text-red-400' : 'text-white/30 group-focus-within:text-emerald-400'}`} />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder={isRegister ? '设置密码（至少 8 位，含大小写和数字）' : '请输入密码'}
                                        value={password}
                                        onChange={(e) => handlePasswordChange(e.target.value)}
                                        onBlur={handlePasswordBlur}
                                        className={`w-full pl-11 pr-11 py-3.5 bg-white/5 border rounded-xl text-sm text-white placeholder:text-white/25 focus:outline-none transition-all ${passwordError ? 'border-red-500/50 focus:border-red-500/70' : 'border-white/10 focus:border-emerald-400/50 focus:bg-white/8'}`}
                                        autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                                        autoCorrect="off"
                                        autoCapitalize="off"
                                        spellCheck={false}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 cursor-pointer transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                {passwordError && (
                                    <p className="text-xs text-red-400 mt-1.5 ml-1 flex items-center gap-1">
                                        <AlertCircle size={11} /> {passwordError}
                                    </p>
                                )}
                                {/* 密码强度指示器（仅注册模式且有输入时显示） */}
                                {isRegister && password.length > 0 && (
                                    <div className="mt-2 flex items-center gap-2">
                                        <div className="flex-1 flex gap-1">
                                            {[0, 1, 2, 3].map(i => (
                                                <div
                                                    key={i}
                                                    className="h-1 flex-1 rounded-full transition-all duration-300"
                                                    style={{
                                                        backgroundColor: i <= passwordStrength.level
                                                            ? passwordStrength.color
                                                            : 'rgba(255,255,255,0.08)',
                                                    }}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-[11px] font-medium shrink-0" style={{ color: passwordStrength.color }}>
                                            {passwordStrength.label}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* 确认密码 (仅注册) */}
                            {isRegister && (
                                <div>
                                    <div className="relative group">
                                        <Lock size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${confirmError ? 'text-red-400' : 'text-white/30 group-focus-within:text-emerald-400'}`} />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="请再次输入密码"
                                            value={confirmPassword}
                                            onChange={(e) => handleConfirmChange(e.target.value)}
                                            className={`w-full pl-11 pr-4 py-3.5 bg-white/5 border rounded-xl text-sm text-white placeholder:text-white/25 focus:outline-none transition-all ${confirmError ? 'border-red-500/50 focus:border-red-500/70' : 'border-white/10 focus:border-emerald-400/50 focus:bg-white/8'}`}
                                            autoComplete="new-password"
                                            autoCorrect="off"
                                            autoCapitalize="off"
                                            spellCheck={false}
                                        />
                                        {/* 匹配状态图标 */}
                                        {confirmTouched && confirmPassword && (
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2">
                                                {confirmError
                                                    ? <AlertCircle size={14} className="text-red-400" />
                                                    : <CheckCircle2 size={14} className="text-emerald-400" />}
                                            </span>
                                        )}
                                    </div>
                                    {confirmError && (
                                        <p className="text-xs text-red-400 mt-1.5 ml-1 flex items-center gap-1">
                                            <AlertCircle size={11} /> {confirmError}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* 邀请码 (仅注册) */}
                            {isRegister && (
                                <div className="relative group">
                                    <Gift size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-amber-400 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="邀请码（可选，填写可获额外奖励）"
                                        value={referralCode}
                                        onChange={(e) => setReferralCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                                        maxLength={6}
                                        className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-amber-400/50 focus:bg-white/8 transition-all uppercase tracking-widest"
                                    />
                                </div>
                            )}

                            {/* Turnstile 人机验证 */}
                            <div className="flex justify-center">
                                <Turnstile
                                    onVerify={(token) => setTurnstileToken(token)}
                                    onExpire={() => setTurnstileToken('')}
                                    onError={() => setTurnstileToken('')}
                                    theme="dark"
                                />
                            </div>

                            {/* 全局错误/成功提示 */}
                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 flex items-center gap-2">
                                    <AlertCircle size={14} className="shrink-0" /> {error}
                                </div>
                            )}
                            {success && (
                                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-sm text-emerald-400 flex items-center gap-2">
                                    <Sparkles size={14} /> {success}
                                </div>
                            )}
                        </div>

                        {/* 提交按钮 */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-lg mt-4"
                            style={{
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
                            }}
                        >
                            {loading ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : tab === 'login' ? (
                                <>登录</>
                            ) : (
                                <>注册</>
                            )}
                        </button>

                        {/* 协议 */}
                        <div className="flex items-center gap-2 mt-4 justify-center">
                            <button
                                type="button"
                                onClick={() => setAgreed(!agreed)}
                                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${agreed ? 'border-emerald-400 bg-emerald-400' : 'border-white/20'}`}
                            >
                                {agreed && <span className="text-[8px] text-white font-bold">✓</span>}
                            </button>
                            <span className="text-xs text-white/30">
                                同意《<span className="text-white/50 hover:text-emerald-400 cursor-pointer">用户协议</span>》和《<span className="text-white/50 hover:text-emerald-400 cursor-pointer">隐私条款</span>》
                            </span>
                        </div>

                        {/* 底部切换 */}
                        <p className="text-center text-xs text-white/30 mt-4">
                            {tab === 'login' ? (
                                <>还没有账号？<button type="button" onClick={() => { setTab('register'); setError(''); setEmailError(''); setPasswordError(''); }} className="text-emerald-400 hover:underline cursor-pointer">立即注册</button></>
                            ) : (
                                <>已有账号？<button type="button" onClick={() => { setTab('login'); setError(''); setEmailError(''); setPasswordError(''); setConfirmError(''); }} className="text-emerald-400 hover:underline cursor-pointer">去登录</button></>
                            )}
                        </p>
                    </form>
                </div>
            </div>
        </div>,
        document.body
    );
}
