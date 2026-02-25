import { Metadata } from 'next';

export const metadata: Metadata = {
    title: '下载客户端',
    description: 'theone58 多平台客户端下载 — 支持 iOS、Android、macOS、TV 全平台',
    openGraph: {
        title: 'theone58 - 下载客户端',
        description: '支持 iOS、Android、macOS、TV 全平台客户端下载',
    },
};

export default function DownloadLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
