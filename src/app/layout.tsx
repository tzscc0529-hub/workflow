import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Video Skeleton Analyst | 视频骨架分析工具',
    template: '%s | Video Skeleton Analyst',
  },
  description:
    '基于 Gemini AI 的视频骨架分析工具，上传视频即可自动生成结构化分析报告。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.COZE_PROJECT_ENV === 'DEV';

  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {isDev && <Inspector />}
        {children}
      </body>
    </html>
  );
}