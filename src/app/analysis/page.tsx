'use client';

import { useState, useRef, useCallback } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import {
  Upload,
  FileVideo,
  CheckCircle2,
  Loader2,
  XCircle,
  Clock,
  Trash2,
  Tag,
  RotateCcw,
  Brain,
  FileText,
  Download,
} from 'lucide-react';

type VideoStatus = 'waiting' | 'uploading' | 'analyzing' | 'completed' | 'failed';

interface VideoItem {
  id: string;
  name: string;
  size: string;
  rawSize: number;
  status: VideoStatus;
  analysisResult?: Record<string, unknown>;
  reportMarkdown?: string;
  category?: string;
  error?: string;
}

const statusConfig: Record<VideoStatus, { icon: typeof Clock; label: string; className: string; bgClass: string }> = {
  waiting: { icon: Clock, label: '等待处理', className: 'text-muted-foreground', bgClass: 'bg-muted' },
  uploading: { icon: Loader2, label: '上传中', className: 'text-warning', bgClass: 'bg-warning/10' },
  analyzing: { icon: Brain, label: '分析中', className: 'text-warning', bgClass: 'bg-warning/10' },
  completed: { icon: CheckCircle2, label: '已完成', className: 'text-success', bgClass: 'bg-success/10' },
  failed: { icon: XCircle, label: '失败', className: 'text-destructive', bgClass: 'bg-destructive/10' },
};

const TAG_CATEGORIES = ['解说向', '玩法向', '展示向', '剧情演绎', '前贴', '全贴'] as const;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

export default function AnalysisPage() {
  const [videoList, setVideoList] = useState<VideoItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const analyzeVideo = useCallback(async (file: File) => {
    const id = crypto.randomUUID();
    const newVideo: VideoItem = {
      id,
      name: file.name,
      size: formatFileSize(file.size),
      rawSize: file.size,
      status: 'uploading',
    };

    setVideoList((list) => [...list, newVideo]);

    try {
      setVideoList((list) =>
        list.map((v) => (v.id === id ? { ...v, status: 'analyzing' as VideoStatus } : v))
      );

      // 直接以 FormData 提交视频文件，由服务端直传 Gemini Files API 逐镜头分析
      const formData = new FormData();
      formData.append('file', file);
      formData.append('model', selectedModel);

      const analyzeRes = await fetch('/api/video/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!analyzeRes.ok) {
        const err = await analyzeRes.json();
        throw new Error(err.error || '分析失败');
      }

      const analyzeData = await analyzeRes.json();

      // 保存到记忆
      try {
        await fetch('/api/video/memory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoName: file.name,
            videoUrl: '',
            analysisResult: analyzeData.analysis,
            reportMarkdown: analyzeData.reportMarkdown,
            category: analyzeData.analysis?.category,
            tags: analyzeData.analysis?.tags || [analyzeData.analysis?.category],
            status: 'completed',
          }),
        });
      } catch {
        console.warn('记忆保存失败，但分析已完成');
      }

      setVideoList((list) =>
        list.map((v) =>
          v.id === id
            ? {
                ...v,
                status: 'completed' as VideoStatus,
                analysisResult: analyzeData.analysis,
                reportMarkdown: analyzeData.reportMarkdown,
                category: typeof analyzeData.analysis?.category === 'string' ? analyzeData.analysis.category : undefined,
              }
            : v
        )
      );
    } catch (error) {
      setVideoList((list) =>
        list.map((v) =>
          v.id === id
            ? { ...v, status: 'failed' as VideoStatus, error: error instanceof Error ? error.message : '未知错误' }
            : v
        )
      );
    }
  }, [selectedModel]);

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      analyzeVideo(files[i]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleRemoveVideo = (id: string) => {
    setVideoList((list) => list.filter((v) => v.id !== id));
  };

  const downloadReport = useCallback((video: VideoItem) => {
    if (!video.reportMarkdown) return;
    const blob = new Blob([video.reportMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${video.name.replace(/\.[^.]+$/, '')}_分析报告.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <AppLayout>
      <div className="max-w-6xl space-y-12">
        <div>
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            视频分析
          </h1>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            本地视频直传后端 → Gemini Files API 逐镜头分析 → 自动贴标签 → 生成报告
          </p>
        </div>

        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-2 space-y-8">
            {/* Upload Area */}
            <div
              className={`border-2 border-dashed p-12 text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-border/50 bg-surface-container-lowest hover:border-border'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm font-medium mb-1">
                拖拽本地视频文件到此处，或点击选择
              </p>
              <p className="text-xs text-muted-foreground">
                支持 MP4 · MOV · AVI · MKV · WebM 格式
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp4,.mov,.m4v,.avi,.mkv,.webm"
                className="hidden"
                multiple
                onChange={(e) => handleFileSelect(e.target.files)}
              />
            </div>

            {/* Video List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2
                  className="text-lg font-semibold tracking-wide"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  视频列表
                </h2>
                {videoList.length > 0 && (
                  <span className="text-xs text-muted-foreground">{videoList.length} 个视频</span>
                )}
              </div>

              {videoList.length === 0 ? (
                <div className="bg-surface-container-lowest shadow-card border border-border/20 p-12 text-center">
                  <FileVideo className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">暂无视频</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    选择本地视频文件后，将直传云端并调用 Gemini 进行 AI 分析
                  </p>
                </div>
              ) : (
                <div className="bg-surface-container-lowest shadow-card border border-border/20 divide-y divide-border/20">
                  {videoList.map((video) => {
                    const status = statusConfig[video.status];
                    const StatusIcon = status.icon;
                    return (
                      <div key={video.id} className="px-6 py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <FileVideo className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{video.name}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{video.size}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 ${status.bgClass} ${status.className}`}>
                              <StatusIcon className={`w-3 h-3 ${video.status === 'analyzing' || video.status === 'uploading' ? 'animate-spin' : ''}`} />
                              {status.label}
                            </span>
                            {video.status === 'completed' && video.category && (
                              <span
                                className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 bg-primary text-primary-foreground"
                              >
                                <Tag className="w-2.5 h-2.5" />
                                {video.category}
                              </span>
                            )}
                            {video.status !== 'analyzing' && video.status !== 'uploading' && (
                              <button
                                onClick={() => handleRemoveVideo(video.id)}
                                className="p-1 text-muted-foreground/40 hover:text-destructive transition-colors"
                                title="删除"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {video.status === 'failed' && video.error && (
                          <p className="mt-2 text-xs text-destructive">{video.error}</p>
                        )}

                        {video.status === 'completed' && video.analysisResult && (
                          <div className="mt-4 border-t border-border/20 pt-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground tracking-widest uppercase">分析结果</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {video.reportMarkdown && (
                                  <button
                                    onClick={() => downloadReport(video)}
                                    className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 border border-border/30 hover:bg-muted transition-colors"
                                  >
                                    <Download className="w-3 h-3" />
                                    下载报告
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-xs">
                              {video.analysisResult.core_highlight ? (
                                <div className="col-span-2">
                                  <span className="text-muted-foreground">核心亮点：</span>
                                  <span className="text-foreground">{String(video.analysisResult.core_highlight)}</span>
                                </div>
                              ) : null}
                              {Array.isArray(video.analysisResult.segments) ? (
                                <div>
                                  <span className="text-muted-foreground">镜头数：</span>
                                  <span className="text-foreground">
                                    {(video.analysisResult.segments as unknown[]).length} 个
                                  </span>
                                </div>
                              ) : null}
                              {video.category ? (
                                <div>
                                  <span className="text-muted-foreground">分类：</span>
                                  <span className="text-foreground">{video.category}</span>
                                </div>
                              ) : null}
                              {video.analysisResult.pain_point_analysis ? (
                                <div className="col-span-2">
                                  <span className="text-muted-foreground">痛点：</span>
                                  <span className="text-foreground">{String(video.analysisResult.pain_point_analysis)}</span>
                                </div>
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
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h2
                className="text-lg font-semibold tracking-wide"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                模型配置
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground tracking-widest uppercase mb-1.5 block">
                    AI 模型
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full border-none bg-muted px-3 py-2 text-sm focus:ring-2 focus:ring-ring/30 focus:outline-none"
                  >
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash（推荐）</option>
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h2
                className="text-lg font-semibold tracking-wide"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                自动标签
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                分析完成后，AI 自动将视频归类为以下标签：
              </p>
              <div className="flex flex-wrap gap-1.5">
                {TAG_CATEGORIES.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-1 bg-muted border border-border/20"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <button
                onClick={() => {
                  if (fileInputRef.current) fileInputRef.current.click();
                }}
                className="w-full bg-primary text-primary-foreground px-4 py-3 text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                选择视频并分析
              </button>
              <button
                onClick={() => setVideoList([])}
                className="w-full border border-border/30 px-4 py-3 text-sm text-muted-foreground hover:bg-muted transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                清空列表
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}