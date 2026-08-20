'use client';

import { AppLayout } from '@/components/layout/app-layout';
import {
  Film,
  Clock,
  FileText,
  Database,
  ArrowRight,
} from 'lucide-react';

const stats = [
  { label: '已分析视频', value: '0', icon: Film },
  { label: '待处理任务', value: '0', icon: Clock },
  { label: '分析报告', value: '0', icon: FileText },
  { label: '知识库条目', value: '0', icon: Database },
];

export default function HomePage() {
  return (
    <AppLayout>
      <div className="max-w-6xl space-y-12">
        {/* Page Title */}
        <div>
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            概览
          </h1>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            视频骨架分析平台 · 基于 Gemini AI 的智能视频内容结构化分析工具
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-6">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-surface-container-lowest shadow-card border border-border/20 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <stat.icon className="w-5 h-5 text-muted-foreground" />
              </div>
              <p
                className="text-5xl font-bold tracking-tight"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {stat.value}
              </p>
              <p className="text-xs text-muted-foreground mt-2 tracking-widest uppercase">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-3 gap-8">
          {/* Recent Activities */}
          <div className="col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2
                className="text-xl font-semibold tracking-wide"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                最近分析活动
              </h2>
              <a
                href="/reports"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                查看全部 <ArrowRight className="w-3 h-3" />
              </a>
            </div>

            <div className="bg-surface-container-lowest shadow-card border border-border/20 p-12 text-center">
              <Film className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">暂无分析活动</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                上传视频开始分析后，活动记录将显示在这里
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            <h2
              className="text-xl font-semibold tracking-wide"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              快速操作
            </h2>

            {/* Primary Action Card - Dark Theme */}
            <a
              href="/analysis"
              className="block bg-primary text-primary-foreground p-8 hover:opacity-90 transition-opacity"
            >
              <Film className="w-8 h-8 mb-6" />
              <p
                className="text-2xl font-bold mb-3"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                开始新分析
              </p>
              <p className="text-sm text-primary-foreground/70 leading-relaxed">
                上传视频文件，配置分析参数，AI 将自动生成结构化分析报告
              </p>
            </a>

            {/* Secondary Links */}
            <div className="space-y-2">
              <a
                href="/reports"
                className="flex items-center justify-between px-4 py-3 bg-surface-container-lowest border border-border/20 hover:border-border/40 transition-colors text-sm"
              >
                <span className="text-muted-foreground">查看报告</span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
              </a>
              <a
                href="/knowledge"
                className="flex items-center justify-between px-4 py-3 bg-surface-container-lowest border border-border/20 hover:border-border/40 transition-colors text-sm"
              >
                <span className="text-muted-foreground">管理知识库</span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
              </a>
            </div>
          </div>
        </div>

        {/* System Intro - Dark Card */}
        <div className="bg-primary text-primary-foreground p-10">
          <div className="max-w-2xl">
            <p
              className="text-2xl font-bold mb-4"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Video Skeleton Analyst
            </p>
            <p className="text-sm text-primary-foreground/60 leading-relaxed mb-6">
              基于 Google Gemini 大语言模型构建的视频内容智能分析平台。支持
              MP4、MOV、AVI、MKV、WebM
              等主流视频格式，自动识别视频中的场景结构、角色行为、对话内容与关键事件，生成结构化
              JSON 分析报告，为视频内容创作者和分析师提供高效、精准的内容洞察。
            </p>
            <div className="flex gap-8 text-xs text-primary-foreground/40 tracking-widest uppercase">
              <span>核心引擎 · Gemini 2.5 Flash</span>
              <span>支持格式 · MP4 / MOV / AVI / MKV</span>
              <span>部署方式 · 本地 / 云端</span>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}