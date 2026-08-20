'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import {
  Search,
  FileText,
  Trash2,
  Tag,
  ChevronDown,
  ChevronRight,
  Download,
  ExternalLink,
  RefreshCw,
  Loader2,
  Filter,
} from 'lucide-react';

interface AnalysisRecord {
  id: number;
  video_name: string;
  video_key: string;
  video_url: string;
  analysis_result: Record<string, unknown> | null;
  report_markdown: string | null;
  report_url: string | null;
  tags: string[] | null;
  category: string | null;
  status: string;
  created_at: string;
}

const TAG_CATEGORIES = ['全部', '解说向', '玩法向', '展示向', '剧情演绎', '前贴', '全贴'] as const;

export default function ReportsPage() {
  const [records, setRecords] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('全部');
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/video/memory');
      if (!res.ok) throw new Error('获取记录失败');
      const data = await res.json();
      setRecords(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/video/memory?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('删除失败');
      setRecords((list) => list.filter((r) => r.id !== id));
      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err) {
      console.error('删除失败:', err);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      !searchQuery ||
      r.video_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      activeFilter === '全部' || r.category === activeFilter;
    return matchesSearch && matchesFilter;
  });

  // Stats
  const totalCount = records.length;
  const taggedCount = records.filter((r) => r.category).length;

  return (
    <AppLayout>
      <div className="max-w-6xl space-y-12">
        <div>
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            分析报告
          </h1>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            查看所有视频分析记录，按标签分类筛选
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-6">
          <div className="bg-surface-container-lowest shadow-card border border-border/20 p-6">
            <p className="text-xs text-muted-foreground tracking-widest uppercase mb-2">总记录</p>
            <p
              className="text-4xl font-bold"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {totalCount}
            </p>
          </div>
          <div className="bg-surface-container-lowest shadow-card border border-border/20 p-6">
            <p className="text-xs text-muted-foreground tracking-widest uppercase mb-2">已标签</p>
            <p
              className="text-4xl font-bold"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {taggedCount}
            </p>
          </div>
          <div className="col-span-2 bg-primary p-6">
            <p className="text-xs text-primary-foreground/60 tracking-widest uppercase mb-2">记忆库</p>
            <p className="text-base text-primary-foreground">
              所有分析结果自动存入云端记忆，随时检索回顾
            </p>
          </div>
        </div>

        {/* Filter + Search */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <div className="flex gap-1">
              {TAG_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveFilter(cat)}
                  className={`text-xs px-3 py-1.5 transition-colors ${
                    activeFilter === cat
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
              <input
                type="text"
                placeholder="搜索视频名称..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 border-none bg-muted pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-ring/30 focus:outline-none"
              />
            </div>
            <button
              onClick={fetchRecords}
              disabled={loading}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              title="刷新"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Records List */}
        {loading ? (
          <div className="bg-surface-container-lowest shadow-card border border-border/20 p-16 text-center">
            <Loader2 className="w-8 h-8 text-muted-foreground/30 animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">加载中...</p>
          </div>
        ) : error ? (
          <div className="bg-surface-container-lowest shadow-card border border-border/20 p-16 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <button
              onClick={fetchRecords}
              className="mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              点击重试
            </button>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="bg-surface-container-lowest shadow-card border border-border/20 p-16 text-center">
            <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {records.length === 0 ? '暂无分析记录' : '无匹配结果'}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {records.length === 0
                ? '在视频分析页面上传并分析视频后，结果将自动显示在这里'
                : '尝试调整筛选条件或搜索关键词'}
            </p>
          </div>
        ) : (
          <div className="bg-surface-container-lowest shadow-card border border-border/20 divide-y divide-border/20">
            {filteredRecords.map((record) => {
              const isExpanded = expandedIds.has(record.id);
              const analysis = record.analysis_result;
              return (
                <div key={record.id}>
                  <div
                    className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => toggleExpand(record.id)}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <button className="p-0.5 text-muted-foreground">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{record.video_name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(record.created_at).toLocaleString('zh-CN')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      {record.tags && record.tags.length > 0 && (
                        <div className="flex gap-1">
                          {record.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 bg-primary text-primary-foreground"
                            >
                              <Tag className="w-2.5 h-2.5" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {record.category && (
                        <span className="text-xs text-muted-foreground">{record.category}</span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(record.id);
                        }}
                        className="p-1.5 text-muted-foreground/30 hover:text-destructive transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  {isExpanded && analysis && (
                    <div className="px-16 py-6 bg-muted/20 border-t border-border/10">
                      <div className="grid grid-cols-3 gap-6">
                        {analysis.summary ? (
                          <div className="col-span-3">
                            <p className="text-xs text-muted-foreground tracking-widest uppercase mb-1">概要</p>
                            <p className="text-sm leading-relaxed">{String(analysis.summary)}</p>
                          </div>
                        ) : null}
                        {analysis.style ? (
                          <div>
                            <p className="text-xs text-muted-foreground tracking-widest uppercase mb-1">风格</p>
                            <p className="text-sm">{String(analysis.style)}</p>
                          </div>
                        ) : null}
                        {record.category ? (
                          <div>
                            <p className="text-xs text-muted-foreground tracking-widest uppercase mb-1">分类</p>
                            <p className="text-sm">{record.category}</p>
                          </div>
                        ) : null}
                        {(() => {
                          const scenes = (analysis as Record<string, unknown>).scenes as string[] | undefined;
                          if (Array.isArray(scenes) && scenes.length > 0) {
                            return (
                              <div className="col-span-3">
                                <p className="text-xs text-muted-foreground tracking-widest uppercase mb-1">关键场景</p>
                                <ul className="list-disc list-inside text-sm space-y-0.5">
                                  {scenes.map((scene, i) => (
                                    <li key={i}>{String(scene)}</li>
                                  ))}
                                </ul>
                              </div>
                            );
                          }
                          return null;
                        })()}
                        {analysis.elements ? (
                          <div className="col-span-3">
                            <p className="text-xs text-muted-foreground tracking-widest uppercase mb-1">主要元素</p>
                            <p className="text-sm leading-relaxed">{String(analysis.elements)}</p>
                          </div>
                        ) : null}
                      </div>

                      {/* Download & Preview */}
                      <div className="mt-4 pt-4 border-t border-border/10 flex gap-3 flex-wrap">
                        <button
                          onClick={() => {
                            const blob = new Blob([JSON.stringify(analysis, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${record.video_name.replace(/\.[^.]+$/, '')}_analysis.json`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Download className="w-3 h-3" />
                          下载 JSON
                        </button>
                        {record.report_markdown ? (
                          <button
                            onClick={() => {
                              const blob = new Blob([record.report_markdown || ''], { type: 'text/markdown' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `${record.video_name.replace(/\.[^.]+$/, '')}_report.md`;
                              a.click();
                              URL.revokeObjectURL(url);
                            }}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Download className="w-3 h-3" />
                            下载报告 (Markdown)
                          </button>
                        ) : null}
                        {record.report_url ? (
                          <button
                            onClick={() => window.open(record.report_url || '', '_blank')}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            预览报告
                          </button>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}