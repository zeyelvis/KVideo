import { Metadata } from 'next';

export const metadata: Metadata = {
    title: '关于我们 — 爱看片片的故事 | iKanPP',
    description: '一个海外留学生的假期逆袭：用AI技术打造免费、丝滑、懂你的影视聚合搜索平台。人在海外，看片自由，从这儿开始。',
    keywords: '爱看片片,iKanPP,品牌故事,海外看剧,免费影视,影视聚合搜索',
    openGraph: {
        title: '关于我们 — 爱看片片的故事',
        description: '一个海外留学生的假期逆袭：用AI技术打造免费、丝滑、懂你的影视聚合搜索平台。',
        type: 'website',
    },
};

export default function AboutLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
