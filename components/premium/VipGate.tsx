'use client';

/**
 * VipGate — VIP 门禁包裹组件
 * 检查用户 VIP 状态，非 VIP 显示开通引导
 */
import { useState, useEffect } from 'react';
import { useUserStore } from '@/lib/store/user-store';
import { VipPrompt } from './VipPrompt';
import { AuthModal } from '@/components/auth/AuthModal';

interface VipGateProps {
    children: React.ReactNode;
    /** 可选：自定义加载态 */
    fallback?: React.ReactNode;
}

export function VipGate({ children, fallback }: VipGateProps) {
    const { user, initialized, initialize } = useUserStore();
    const [showLogin, setShowLogin] = useState(false);

    // 确保用户状态已初始化
    useEffect(() => {
        initialize();
    }, [initialize]);

    // 加载中
    if (!initialized) {
        return fallback || (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-color)' }}>
                <div className="brand-spinner" />
            </div>
        );
    }

    // VIP 用户 → 正常渲染
    if (user?.isVip) {
        return <>{children}</>;
    }

    // 非 VIP / 未登录 → 显示开通引导
    return (
        <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-color)', backgroundImage: 'var(--bg-image)' }}>
            <VipPrompt
                onOpenLogin={() => setShowLogin(true)}
            />

            {/* 登录弹窗 */}
            {showLogin && (
                <AuthModal
                    isOpen={showLogin}
                    onClose={() => setShowLogin(false)}
                />
            )}
        </div>
    );
}
