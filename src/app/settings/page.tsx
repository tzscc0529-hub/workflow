'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import {
  Zap, FolderOpen, Save, RotateCcw,
  Check, X, KeyRound
} from 'lucide-react';

const STORAGE_KEY = 'video_skeleton_settings';

interface SettingsData {
  videoDir: string;
  outputDir: string;
  databaseDir: string;
  knowledgeCache: string;
  defaultModel: string;
  maxRetries: number;
  httpTimeout: number;
  fileProcessTimeout: number;
  maxOutputTokens: number;
  pollInterval: number;
  temperature: number;
  topP: number;
  uploadMode: string;
  chunkSize: number;
  targetCompressSize: number;
}

interface KeyStatus {
  configured: boolean;
  masked: string;
}

const DEFAULTS: SettingsData = {
  videoDir: 'videos',
  outputDir: 'reports',
  databaseDir: 'database',
  knowledgeCache: 'database/knowledge_cache.json',
  defaultModel: 'gemini-2.5-flash',
  maxRetries: 3,
  httpTimeout: 300000,
  fileProcessTimeout: 1800,
  maxOutputTokens: 32768,
  pollInterval: 5,
  temperature: 0.1,
  topP: 0.95,
  uploadMode: 'auto',
  chunkSize: 8192,
  targetCompressSize: 7,
};

function loadSettings(): SettingsData {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { /* ignore parse errors */ }
  return DEFAULTS;
}

function saveSettings(data: SettingsData) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData>(DEFAULTS);
  const [keyStatus, setKeyStatus] = useState<KeyStatus>({ configured: false, masked: '' });
  const [keyStatusLoading, setKeyStatusLoading] = useState(true);
  const [testResult, setTestResult] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testError, setTestError] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Load settings from localStorage + fetch key status on mount
  useEffect(() => {
    setSettings(loadSettings());
    fetch('/api/settings/key-status')
      .then((r) => r.json())
      .then((d: KeyStatus) => setKeyStatus(d))
      .catch(() => setKeyStatus({ configured: false, masked: '' }))
      .finally(() => setKeyStatusLoading(false));
  }, []);

  // Save toast auto-dismiss
  useEffect(() => {
    if (saveToast) {
      const timer = setTimeout(() => setSaveToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveToast]);

  const updateSetting = useCallback(<K extends keyof SettingsData>(key: K, value: SettingsData[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      return next;
    });
  }, []);

  const handleTestConnection = async () => {
    setTestResult('testing');
    setTestError(null);
    try {
      const res = await fetch('/api/settings/test-connection', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (data.ok) {
        setTestResult('success');
      } else {
        setTestResult('error');
        setTestError(data.error || '连接失败');
      }
    } catch (e) {
      setTestResult('error');
      setTestError(e instanceof Error ? e.message : '无法连接 Gemini API');
    }
  };

  const handleSave = () => {
    saveSettings(settings);
    setSaveToast('配置已保存');
  };

  const handleReset = () => {
    if (typeof window !== 'undefined' && !confirm('确认重置所有配置为默认值？')) return;
    setSettings(DEFAULTS);
    saveSettings(DEFAULTS);
    setSaveToast('已恢复默认配置');
  };

  const handleBrowse = (key: keyof SettingsData) => {
    const newPath = prompt('请输入目录路径：', settings[key] as string);
    if (newPath !== null && newPath.trim()) {
      updateSetting(key, newPath.trim());
    }
  };

  // ── shared input classes ──
  const inputClass = 'w-full border-none bg-muted px-3 py-2.5 text-sm focus:ring-2 focus:ring-ring/30 focus:outline-none';

  return (
    <AppLayout>
      <div className="max-w-4xl space-y-12">
        <div>
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            系统配置
          </h1>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            管理 API 密钥、目录路径、分析参数与上传设置
          </p>
        </div>

        {/* Section 1: API Key */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <span
              className="text-2xl font-bold text-muted-foreground/30"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              一
            </span>
            <h2
              className="text-xl font-semibold tracking-wide"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              API 密钥配置
            </h2>
          </div>
          <div className="bg-surface-container-lowest shadow-card border border-border/20 p-6 space-y-4">
            <div>
              <label className="text-xs text-muted-foreground tracking-widest uppercase mb-1.5 block">
                Gemini API Key
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={
                    keyStatusLoading
                      ? '加载中...'
                      : keyStatus.configured
                        ? keyStatus.masked
                        : '未配置'
                  }
                  readOnly
                  className="w-full border-none bg-muted px-3 py-2.5 pr-10 text-sm focus:ring-2 focus:ring-ring/30 focus:outline-none font-mono"
                />
                <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                密钥由服务端保管，此页面仅显示脱敏状态 · 请勿将密钥写入前端代码
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleTestConnection}
                disabled={testResult === 'testing'}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Zap className="w-4 h-4" />
                测试连接
              </button>
              {testResult === 'testing' && (
                <span className="text-sm text-warning animate-pulse">测试中...</span>
              )}
              {testResult === 'success' && (
                <span className="text-sm text-success flex items-center gap-1.5">
                  ✓ 连接成功 — Gemini API 响应正常
                </span>
              )}
              {testResult === 'error' && (
                <span className="text-sm text-destructive flex items-center gap-1.5">
                  ✗ {testError || '连接失败'}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Section 2: Directory Paths */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <span
              className="text-2xl font-bold text-muted-foreground/30"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              二
            </span>
            <h2
              className="text-xl font-semibold tracking-wide"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              目录路径配置
            </h2>
          </div>
          <div className="bg-surface-container-lowest shadow-card border border-border/20 p-6 space-y-4">
            {[
              {
                key: 'videoDir' as const,
                label: '视频目录 (ANALYST_VIDEO_DIR)',
                placeholder: '例如：videos 或 /data/videos',
              },
              {
                key: 'outputDir' as const,
                label: '输出目录 (ANALYST_OUTPUT_DIR)',
                placeholder: '例如：reports 或 ./output',
              },
              {
                key: 'databaseDir' as const,
                label: '数据库目录 (ANALYST_DATABASE_DIR)',
                placeholder: '例如：database 或 /data/db',
              },
              {
                key: 'knowledgeCache' as const,
                label: '知识缓存路径 (ANALYST_KNOWLEDGE_CACHE)',
                placeholder: '例如：database/knowledge_cache.json',
              },
            ].map((field) => {
              const currentValue = settings[field.key] as string;
              const isDefault = currentValue === DEFAULTS[field.key];
              return (
                <div key={field.key}>
                  <label className="text-xs text-muted-foreground tracking-widest uppercase mb-1.5 block">
                    {field.label}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={currentValue}
                      onChange={(e) => updateSetting(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className={`flex-1 ${inputClass} font-mono`}
                    />
                    <button
                      onClick={() => handleBrowse(field.key)}
                      className="inline-flex items-center gap-1.5 px-3 py-2.5 border border-border/30 text-sm text-muted-foreground hover:bg-muted transition-colors"
                      title="修改路径"
                    >
                      <FolderOpen className="w-4 h-4" />
                      浏览
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    当前路径：<code className="text-[11px] bg-muted px-1 py-0.5">{currentValue}</code>
                    {isDefault && <span className="ml-2 text-muted-foreground/60">（默认值）</span>}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 3: Analysis Parameters */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <span
              className="text-2xl font-bold text-muted-foreground/30"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              三
            </span>
            <h2
              className="text-xl font-semibold tracking-wide"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              分析参数配置
            </h2>
          </div>
          <div className="bg-surface-container-lowest shadow-card border border-border/20 p-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground tracking-widest uppercase mb-1.5 block">
                  默认模型 (GEMINI_MODEL)
                </label>
                <select
                  value={settings.defaultModel}
                  onChange={(e) => updateSetting('defaultModel', e.target.value)}
                  className={inputClass}
                >
                  <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                  <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                  <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground tracking-widest uppercase mb-1.5 block">
                  最大重试次数 (ANALYST_MAX_RETRIES)
                </label>
                <input
                  type="number"
                  value={settings.maxRetries}
                  onChange={(e) => updateSetting('maxRetries', Math.max(1, Number(e.target.value)))}
                  min={1}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground tracking-widest uppercase mb-1.5 block">
                  HTTP 超时 ms (ANALYST_HTTP_TIMEOUT_MS)
                </label>
                <input
                  type="number"
                  value={settings.httpTimeout}
                  onChange={(e) => updateSetting('httpTimeout', Math.max(10000, Number(e.target.value)))}
                  min={10000}
                  step={1000}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground tracking-widest uppercase mb-1.5 block">
                  文件处理超时 s (ANALYST_FILE_PROCESS_TIMEOUT)
                </label>
                <input
                  type="number"
                  value={settings.fileProcessTimeout}
                  onChange={(e) => updateSetting('fileProcessTimeout', Math.max(60, Number(e.target.value)))}
                  min={60}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground tracking-widest uppercase mb-1.5 block">
                  最大输出 Token (ANALYST_MAX_OUTPUT_TOKENS)
                </label>
                <input
                  type="number"
                  value={settings.maxOutputTokens}
                  onChange={(e) => updateSetting('maxOutputTokens', Math.max(1024, Number(e.target.value)))}
                  min={1024}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground tracking-widest uppercase mb-1.5 block">
                  轮询间隔 s (ANALYST_PROCESS_POLL_INTERVAL)
                </label>
                <input
                  type="number"
                  value={settings.pollInterval}
                  onChange={(e) => updateSetting('pollInterval', Math.max(1, Number(e.target.value)))}
                  min={1}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground tracking-widest uppercase mb-1.5 block">
                  温度 (Temperature)
                </label>
                <input
                  type="number"
                  value={settings.temperature}
                  onChange={(e) => updateSetting('temperature', Number(e.target.value))}
                  min={0}
                  max={1}
                  step={0.1}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground tracking-widest uppercase mb-1.5 block">
                  Top-P
                </label>
                <input
                  type="number"
                  value={settings.topP}
                  onChange={(e) => updateSetting('topP', Number(e.target.value))}
                  min={0}
                  max={1}
                  step={0.05}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Upload Settings */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <span
              className="text-2xl font-bold text-muted-foreground/30"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              四
            </span>
            <h2
              className="text-xl font-semibold tracking-wide"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              上传设置
            </h2>
          </div>
          <div className="bg-surface-container-lowest shadow-card border border-border/20 p-6 space-y-4">
            <div>
              <label className="text-xs text-muted-foreground tracking-widest uppercase mb-2 block">
                上传模式 (ANALYST_UPLOAD_MODE)
              </label>
              <div className="flex gap-4">
                {[
                  { value: 'auto', label: 'Auto' },
                  { value: 'original', label: 'Original' },
                  { value: 'compressed', label: 'Compressed' },
                  { value: 'direct', label: 'Direct' },
                ].map((mode) => (
                  <label key={mode.value} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="uploadMode"
                      value={mode.value}
                      checked={settings.uploadMode === mode.value}
                      onChange={(e) => updateSetting('uploadMode', e.target.value)}
                      className="accent-primary"
                    />
                    {mode.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground tracking-widest uppercase mb-1.5 block">
                  分块大小 (KB)
                </label>
                <input
                  type="number"
                  value={settings.chunkSize}
                  readOnly
                  className={`${inputClass} opacity-60 cursor-not-allowed`}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  固定 8 MiB（Gemini API 要求）
                </p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground tracking-widest uppercase mb-1.5 block">
                  目标压缩大小 (MB)
                </label>
                <input
                  type="number"
                  value={settings.targetCompressSize}
                  onChange={(e) => updateSetting('targetCompressSize', Math.max(1, Number(e.target.value)))}
                  min={1}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground tracking-widest uppercase mb-1.5 block">
                允许的文件类型
              </label>
              <div className="flex flex-wrap gap-2">
                {['.mp4', '.mov', '.m4v', '.avi', '.mkv', '.webm'].map((ext) => (
                  <span key={ext} className="inline-flex text-xs px-2 py-1 bg-muted text-muted-foreground font-mono">
                    {ext}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Bottom Actions */}
        <div className="flex items-center gap-4 pt-4 border-t border-border/20">
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Save className="w-4 h-4" />
            保存配置
          </button>
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 px-6 py-3 border border-border/30 text-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            重置默认
          </button>
        </div>

        {/* Save Toast */}
        {saveToast && (
          <div className="fixed bottom-8 right-8 z-50 bg-success text-white px-4 py-3 text-sm shadow-dialog flex items-center gap-2">
            <Check className="w-4 h-4" />
            {saveToast}
            <button
              onClick={() => setSaveToast(null)}
              className="ml-3 hover:opacity-70"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}