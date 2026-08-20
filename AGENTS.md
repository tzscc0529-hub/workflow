# 项目上下文

## 项目概述

Video Skeleton Analyst（视频骨架分析工具）——基于 Google Gemini AI 的视频内容智能分析平台，将 Python 工作流脚本（`analyst.py`）转换为 Web 应用。

### 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4
- **设计风格**: 杂志风（黑白、留白、强排版、报刊气质）

## 目录结构

```
├── public/                 # 静态资源
├── scripts/                # 构建与启动脚本
│   ├── build.sh            # 构建脚本
│   ├── dev.sh              # 开发环境启动脚本
│   ├── prepare.sh          # 预处理脚本
│   └── start.sh            # 生产环境启动脚本
├── src/
│   ├── app/
│   │   ├── globals.css     # 全局样式 + Design Tokens
│   │   ├── layout.tsx      # 根布局
│   │   ├── page.tsx        # 概览页（仪表盘）
│   │   ├── analysis/       # 视频分析页
│   │   ├── reports/        # 分析报告页
│   │   ├── knowledge/      # 知识库页
│   │   └── settings/       # 系统配置页
│   ├── components/
│   │   ├── layout/app-layout.tsx  # 侧边栏 + 顶栏布局
│   │   └── ui/             # Shadcn UI 组件库
│   ├── hooks/              # 自定义 Hooks
│   ├── lib/                # 工具库
│   │   └── utils.ts        # 通用工具函数 (cn)
│   └── server.ts           # 自定义服务端入口
├── .coze                   # 构建与运行配置
├── DESIGN.md               # 设计规范（杂志风）
├── next.config.ts          # Next.js 配置
├── package.json            # 项目依赖管理
└── tsconfig.json           # TypeScript 配置
```

## Design Tokens

设计变量定义在 `src/app/globals.css` 中，杂志风配色：
- 背景：`#F4F1EA`（暖纸色）
- 主色：`#080808`（近黑）
- 文字：`#111111`
- 次文字：`#6B665E`
- 分割线：`#D8D1C4`
- 字体：标题 Playfair Display · 正文 Georgia / Noto Serif SC
- 圆角：0（直角）

## 包管理规范

**仅允许使用 pnpm** 作为包管理器，**严禁使用 npm 或 yarn**。

## 开发规范

### 编码规范
- 默认按 TypeScript `strict` 心智写代码
- 禁止隐式 `any` 和 `as any`
- 所有页面使用 `'use client'` 指令（客户端组件）

### Hydration 问题防范
- 严禁在 JSX 渲染逻辑中直接使用 `typeof window`、`Date.now()`、`Math.random()` 等动态数据
- 必须使用 `'use client'` 并配合 `useEffect` + `useState`

### 布局规范
- 使用 `AppLayout` 组件包裹所有页面内容
- AppLayout 提供：顶栏 + 侧边栏 + 主内容区
- 侧边栏菜单项：概览、视频分析、分析报告、知识库、系统配置
- 主内容区使用 `flex-1` 铺满剩余空间

## 验证命令
- `pnpm ts-check`：TypeScript 类型检查
- `pnpm lint`：ESLint 代码检查
- `pnpm build`：生产构建