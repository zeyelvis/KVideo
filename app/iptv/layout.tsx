import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'IPTV 直播',
    description: 'theone58 IPTV 直播频道 — 支持 M3U 源管理，海量直播频道在线观看',
    openGraph: {
        title: 'theone58 - IPTV 直播',
        description: '支持 M3U 源管理，海量直播频道在线观看',
    },
};

export default function IPTVLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
