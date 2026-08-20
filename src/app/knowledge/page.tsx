'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import {
  Database,
  RefreshCw,
  Trash2,
  Plus,
  X,
  User,
  Swords,
  MessageSquare,
  Gem,
  Loader2,
  HardDrive,
} from 'lucide-react';
import { getKnowledgeSupabase } from '@/storage/knowledge-supabase';

interface HeroRecord {
  id: string;
  name: string;
  active_skill?: string;
  portrait?: string;
}

interface MissionRecord {
  id: string;
  systemId?: string;
  name?: string;
}

interface TreasureRecord {
  id: string;
  name?: string;
}

interface DialogueRecord {
  id: string;
  name?: string;
}

interface LocalEntry {
  id: string;
  name: string;
  type: 'excel' | 'txt';
  entries: number;
  updatedAt: string;
  cacheSize: string;
}

const TABLE_CONFIG = [
  { table: 'hero', label: '武将信息', icon: User, color: 'text-primary' },
  { table: 'MISSION', label: '任务表', icon: Swords, color: 'text-primary' },
  { table: 'Treasure', label: '宝物道具', icon: Gem, color: 'text-primary' },
  { table: 'dialogues', label: '对话表', icon: MessageSquare, color: 'text-primary' },
];

export default function KnowledgePage() {
  const supabase = getKnowledgeSupabase();

  // Supabase data
  const [heroes, setHeroes] = useState<HeroRecord[]>([]);
  const [missions, setMissions] = useState<MissionRecord[]>([]);
  const [treasures, setTreasures] = useState<TreasureRecord[]>([]);
  const [dialogues, setDialogues] = useState<DialogueRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Local entries
  const [localEntries, setLocalEntries] = useState<LocalEntry[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newEntry, setNewEntry] = useState({
    name: '',
    type: 'excel' as 'excel' | 'txt',
    entries: 0,
    cacheSize: '',
  });

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [heroRes, missionRes, treasureRes, dialogueRes] = await Promise.all([
        supabase.from('hero').select('*'),
        supabase.from('MISSION').select('*'),
        supabase.from('Treasure').select('*'),
        supabase.from('dialogues').select('*'),
      ]);

      if (heroRes.error) throw new Error(`hero: ${heroRes.error.message}`);
      if (missionRes.error) throw new Error(`MISSION: ${missionRes.error.message}`);
      if (treasureRes.error) throw new Error(`Treasure: ${treasureRes.error.message}`);
      if (dialogueRes.error) throw new Error(`dialogues: ${dialogueRes.error.message}`);

      setHeroes(heroRes.data as HeroRecord[] ?? []);
      setMissions(missionRes.data as MissionRecord[] ?? []);
      setTreasures(treasureRes.data as TreasureRecord[] ?? []);
      setDialogues(dialogueRes.data as DialogueRecord[] ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : '数据加载失败');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleAddLocal = () => {
    if (!newEntry.name.trim() || !newEntry.cacheSize.trim()) return;
    const entry: LocalEntry = {
      id: crypto.randomUUID(),
      name: newEntry.name.trim(),
      type: newEntry.type,
      entries: newEntry.entries || 0,
      updatedAt: new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      cacheSize: newEntry.cacheSize.trim(),
    };
    setLocalEntries((list) => [...list, entry]);
    setNewEntry({ name: '', type: 'excel', entries: 0, cacheSize: '' });
    setShowAddDialog(false);
  };

  const handleRemoveLocal = (id: string) => {
    setLocalEntries((list) => list.filter((e) => e.id !== id));
  };

  const totalRecords = heroes.length + missions.length + treasures.length + dialogues.length + localEntries.length;

  const getTableData = (table: string) => {
    switch (table) {
      case 'hero': return heroes;
      case 'MISSION': return missions;
      case 'Treasure': return treasures;
      case 'dialogues': return dialogues;
      default: return [];
    }
  };

  return (
    <AppLayout>
      <div className="max-w-6xl space-y-10">
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-3xl font-bold tracking-tight"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              知识库
            </h1>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              来自 Supabase 云数据库的知识数据
            </p>
          </div>
          <button
            onClick={fetchAllData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-border/30 text-sm text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            刷新数据
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-surface-container-lowest shadow-card border border-border/20 p-5">
            <p className="text-xs text-muted-foreground tracking-widest uppercase">数据表</p>
            <p
              className="text-4xl font-bold mt-2"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              4
            </p>
          </div>
          <div className="bg-surface-container-lowest shadow-card border border-border/20 p-5">
            <p className="text-xs text-muted-foreground tracking-widest uppercase">总记录数</p>
            <p
              className="text-4xl font-bold mt-2"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {totalRecords}
            </p>
          </div>
          <div className="bg-surface-container-lowest shadow-card border border-border/20 p-5">
            <p className="text-xs text-muted-foreground tracking-widest uppercase">武将</p>
            <p
              className="text-4xl font-bold mt-2"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {heroes.length}
            </p>
          </div>
          <div className="bg-surface-container-lowest shadow-card border border-border/20 p-5">
            <p className="text-xs text-muted-foreground tracking-widest uppercase">本地条目</p>
            <p
              className="text-4xl font-bold mt-2"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {localEntries.length}
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 p-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
            <span className="ml-3 text-sm text-muted-foreground">正在从 Supabase 加载数据...</span>
          </div>
        )}

        {/* Supabase Tables */}
        {!loading && !error && (
          <div className="space-y-8">
            {TABLE_CONFIG.map(({ table, label, icon: Icon, color }) => {
              const data = getTableData(table);
              return (
                <div key={table} className="bg-surface-container-lowest shadow-card border border-border/20">
                  <div className="px-6 py-4 border-b border-border/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 ${color}`} />
                      <h2
                        className="text-lg font-semibold tracking-wide"
                        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                      >
                        {label}
                      </h2>
                      <span className="text-xs text-muted-foreground">
                        ({data.length} 条)
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">
                      supabase.from(&apos;{table}&apos;)
                    </span>
                  </div>

                  {data.length === 0 ? (
                    <div className="p-12 text-center">
                      <Database className="w-8 h-8 text-muted-foreground/20 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">表为空</p>
                      <p className="text-xs text-muted-foreground/50 mt-1">
                        请在 Supabase 控制台添加数据
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/20">
                      {(data as unknown as Record<string, unknown>[]).map((record, index) => (
                        <div
                          key={String(record.id ?? index)}
                          className="flex items-center justify-between px-6 py-3"
                        >
                          <div className="flex items-center gap-4">
                            <span className="text-xs text-muted-foreground font-mono w-6">
                              {index + 1}
                            </span>
                            <div>
                              <p className="text-sm font-medium">
                                {String(record.name ?? record.systemId ?? record.id ?? '—')}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {Object.entries(record)
                                  .filter(([k]) => k !== 'id' && k !== 'name' && k !== 'systemId')
                                  .slice(0, 3)
                                  .map(([k, v]) => `${k}: ${typeof v === 'string' ? v.slice(0, 30) : v}`)
                                  .join(' · ') || '—'}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground font-mono">
                            id: {String(record.id).slice(0, 8)}...
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Local Entries */}
        <div className="bg-surface-container-lowest shadow-card border border-border/20">
          <div className="px-6 py-4 border-b border-border/20 flex items-center justify-between">
            <h2
              className="text-lg font-semibold tracking-wide"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              本地知识条目
            </h2>
            <button
              onClick={() => setShowAddDialog(true)}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <Plus className="w-3.5 h-3.5" />
              添加条目
            </button>
          </div>

          {localEntries.length === 0 ? (
            <div className="p-12 text-center">
              <HardDrive className="w-8 h-8 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">暂无本地条目</p>
              <p className="text-xs text-muted-foreground/50 mt-1">
                点击「添加条目」新建本地知识数据
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/20">
              {localEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between px-6 py-4"
                >
                  <div className="flex items-center gap-4">
                    <Database className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{entry.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {entry.type === 'excel' ? 'Excel' : 'TXT'} ·{' '}
                        {entry.entries} 条记录 · {entry.cacheSize}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{entry.updatedAt}</span>
                    <button
                      onClick={() => handleRemoveLocal(entry.id)}
                      className="p-1.5 text-muted-foreground/40 hover:text-destructive transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Entry Dialog */}
        {showAddDialog && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={() => setShowAddDialog(false)}
          >
            <div
              className="bg-surface-container-lowest shadow-dialog border border-border/30 p-6 w-full max-w-md space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3
                  className="text-lg font-semibold"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  添加本地知识条目
                </h3>
                <button
                  onClick={() => setShowAddDialog(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground tracking-widest uppercase mb-1 block">
                    名称
                  </label>
                  <input
                    type="text"
                    value={newEntry.name}
                    onChange={(e) => setNewEntry((n) => ({ ...n, name: e.target.value }))}
                    placeholder="例如：英雄请出战武将信息"
                    className="w-full border-none bg-muted px-3 py-2 text-sm focus:ring-2 focus:ring-ring/30 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground tracking-widest uppercase mb-1 block">
                    文件类型
                  </label>
                  <select
                    value={newEntry.type}
                    onChange={(e) => setNewEntry((n) => ({ ...n, type: e.target.value as 'excel' | 'txt' }))}
                    className="w-full border-none bg-muted px-3 py-2 text-sm focus:ring-2 focus:ring-ring/30 focus:outline-none"
                  >
                    <option value="excel">Excel (.xlsx)</option>
                    <option value="txt">TXT (.txt)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground tracking-widest uppercase mb-1 block">
                    记录数量
                  </label>
                  <input
                    type="number"
                    value={newEntry.entries}
                    onChange={(e) => setNewEntry((n) => ({ ...n, entries: parseInt(e.target.value) || 0 }))}
                    className="w-full border-none bg-muted px-3 py-2 text-sm focus:ring-2 focus:ring-ring/30 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground tracking-widest uppercase mb-1 block">
                    缓存大小
                  </label>
                  <input
                    type="text"
                    value={newEntry.cacheSize}
                    onChange={(e) => setNewEntry((n) => ({ ...n, cacheSize: e.target.value }))}
                    placeholder="例如：256 KB"
                    className="w-full border-none bg-muted px-3 py-2 text-sm focus:ring-2 focus:ring-ring/30 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowAddDialog(false)}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleAddLocal}
                  disabled={!newEntry.name.trim() || !newEntry.cacheSize.trim()}
                  className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  添加
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}