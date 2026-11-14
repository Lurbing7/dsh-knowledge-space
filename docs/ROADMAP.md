# 路线图：从个人初版到可公开分发的插件

状态：2026-11-14 起草。当前版本 0.1.0，仅在本机 `notes` 库验证过。

## 0. 判断：现在离"别人能用"差在哪

代码能跑，但**三个硬阻断**：

1. **术语与目录是个人化的**。上传目录写死 `assets/知识空间`，`private/` 被当作敏感目录的硬编码判定。别人拿到手会得到一个中文目录名，以及一套只对某个 Obsidian 库成立的约定。
2. **只有中文 UI**。这是 GitHub 上最常见的劝退点：界面、错误信息、工具描述全是中文，非中文用户无法使用，也无法判断插件在做什么。
3. **没有发布元数据与兼容声明**。`private: true`、没有 `engines.dsh`、没有 LICENSE、没有 peer 依赖声明、没有测试与 CI。按官方 `publish` 文档，这样的包无法进入 profile 清单，也无法被插件索引收录。

四个体验硬伤：

4. 目录选择器只枚举 `C:`–`H:`，macOS/Linux 直接不可用。
5. 索引会写进被索引目录（`.dsh-knowledge-space/`），"我就想只读索引一个目录"的人会被冒犯。
6. 没有 watcher，"改完笔记点一下"对 800 篇还行，对 5 万篇就是折磨。
7. 没有取消、没有索引并发、没有 schema 版本——重建一次 10 万文件只能干等。

五个长期风险：

8. `node:sqlite` 仍是 experimental API，Electron/Node 升级可能改签名。
9. FTS5 + bigram 的索引体积约为原文 2.5 倍，超大库会顶到磁盘。
10. PDF 只取文字层，扫描件静默变空文档。
11. 文档解析没有资源上限：zip 炸弹、万页 PDF、单文件 500MB 都能打爆进程。
12. 本地 HTTP 接口虽然限制 loopback，但 `GET /api/fs` 能枚举任意目录。

## 1. 产品定位：凭什么让别人装

一句话：**把任意本地文档目录，变成 DSH 里可检索、可引用、可版本化的知识空间，全程不联网、不建服务、不传云端。**

四条别人没有或没做全的：

- **目录即空间**，不导入、不复制、不改写；Obsidian / 仓库 / 共享盘都能直接当空间。
- **中文优先的分词**。绝大多数英文 RAG 插件对两字中文词直接失效（`事务` 查不到 `事务传播`），我们用 bigram 把这条补上。
- **Agent 与界面同源**。同一份检索能力，人在面板里用，模型用 `knowledge_search` 调，不维护两套逻辑。
- **配置与清单可入 git**。知识空间的边界、清单（含内容哈希）随仓库走，换设备可复现；索引本体不进历史。

## 2. 架构重构：为测试、为扩展、为换后端

现在 `host/` 是能用的，但把 IO、解析、排序、HTTP 混在一起，改一处要跑全量。目标分层：

```
src/
  core/            # 纯函数，零 IO，单测覆盖
    tokenize.js    # 中文 bigram + 拉丁词
    chunk.js       # 标题对齐 + 合并短块 + 重叠
    rank.js        # BM25 结果重排、路径/标题加权、去重
    path.js        # 相对路径、大小写、NFC/NFD 归一
  extract/         # 每种格式一个模块，统一 { sections, meta }
    markdown.js pdf.js docx.js xlsx.js zip.js limits.js
  store/
    sqlite.js      # 唯一知道 node:sqlite 的地方（将来可换 better-sqlite3）
    schema.js      # schemaVersion、迁移
  index/           # walk、增量、队列、取消
  host/
    api.js tools.js prompt.js config.js lifecycle.js
  client/          # React 页面 + 组件（仍单文件打包）
```

验收：`core/` 与 `extract/` 的测试不启动 DSH、不碰磁盘（fixtures 在内存/临时目录），`pnpm test` 5 秒内跑完。

## 3. 兼容性矩阵（踩过的坑要写死）

| 事项 | 事实 | 对策 |
|---|---|---|
| `node:sqlite` | Node 22.5–23.3 需 `--experimental-sqlite`；23.4+ 默认可用；Desktop 的 Electron 44 = Node 24 | `engines.node: ">=24"`，启动时检测，给出可操作报错 |
| `@deepseek-ai/*` 导入 | **linked 本地目录解析不到，npm 安装才解析得到**（本插件踩坑记录） | 运行时代码零 `@deepseek-ai` 依赖；Config 用 schemastery 时同时写 peer + dev，并保留纯 JS 回退 |
| 工具定义 | `tools.register` 要求 `output: { schema, render }`，各版本可能不同 | 注册包一层：先带 output 注册，`TypeError` 时退回旧形状 |
| 槽位 | `main` + `sidebar.panellist` 是当前唯一入口 | 注册前探测 `ctx.slots` 是否声明该槽；失败时只降级不带崩溃 |
| 前端 | 无构建步骤，`client.js` 直接是 ESM 包装 | 保持零构建，避免 `prepare` 授权；换来的是用户 `add` 一次就用 |
| 依赖 | `unpdf` MIT、纯 JS | 保持单一依赖；PDF 解析失败不拖垮整次索引 |

## 4. 逐项改造清单（含验收标准）

### A. 通用化（P0）
- 上传目录默认改 `_knowledge-space/uploads`（中性名，可用 `uploadDir` 改）。
- `private/` 改成通用的 `sensitivePaths: string[]`，默认 `["private", ".env", "*.pem", "*.key"]`，只影响"标记 + 默认不展示"，不再是硬编码。
- 空间元数据位置可选：`metaLocation: "space" | "home"`。默认 `space`（可随仓库走），只读场景选 `home`。
- 索引库位置同理：`indexLocation: "home" | "space"`。
- 验收：在 macOS/Linux 上建空间、索引、检索全通；非中文用户看不到任何中文默认名。

### B. 国际化（P0）
- UI 走 `ctx.locale`，`locale/en.json` + `locale/zh.json`；工具 `description` 与错误信息也走字典。
- 语言回退顺序：请求语言 → `en`。
- 验收：切到 English 后，面板与工具描述无中文字符（用脚本扫描断言）。

### C. Config（P0）
```ts
Config = Schema.object({
  dataDir: Schema.string(),
  defaultExcludeDirs: Schema.array(Schema.string()),
  defaultIncludeExts: Schema.array(Schema.string()),
  maxFileMB: Schema.number().default(30),
  maxPagesPerPdf: Schema.number().default(2000),
  promptHint: Schema.boolean().default(true),
  watch: Schema.boolean().default(false),
})
```
- 每个空间的可调项仍在面板里（per-space 数据），Config 只放"部署级默认值"。
- 验收：改 `cordis.patch.yml` 的 config 后，新空间继承新默认值。

### D. 检索质量（P1，但先立基准）
- 建 `benchmarks/`：20 条真实中文 + 10 条英文查询，标注期望文件与段落，`pnpm bench` 输出 P@1/P@3/MRR。
- 短块合并（<120 字并入相邻）、长块按句切分（中文按 `。！？；`，英文按句点）、块间 80–120 字重叠。
- 标题路径加权与正文分列（已完成）；补 `tags`/frontmatter 过滤。
- 结果去重：同文件最多 2 段（已完成），跨空间 RRF 融合。
- 验收：基准集 MRR 不低于当前值，且每次改动都有对比数字。

### E. 内容安全上限（P0）
- ZIP：条目数 ≤ 2000、单条目解压 ≤ 50MB、总解压 ≤ 300MB，超限报"文件结构异常"。
- PDF：页数上限、单页字符上限、抽取超时。
- 文本：单文档字符上限（如 200 万），超出截断并记录。
- 二进制嗅探：扩展名是 md 但内容含 NUL → 拒绝并说明。
- 编码：GB18030/GBK 文本自动识别，避免中文 Windows 老文件全是乱码入库。
- 验收：每类畸形文件都有单测，进程不崩、索引继续。

### F. 隐私（P0）
- 默认排除 `.env*`、`*.pem`、`*.key`、`id_rsa*`、`*.kdbx`。
- 可选读取空间内 `.gitignore`/`.dshignore`（默认开）。
- 文档里明确：不联网；embedding 是显式可选项，并提示"片段会发往该端点"。
- 面板首次建空间时提示：空间内私密内容会被本机索引。

### G. 索引生命周期（P1）
- `meta.schemaVersion`，不匹配自动重建并告知。
- 取消（AbortSignal 全链路）、并发池（解析 4 并发，SQLite 单写者批量提交）。
- 崩溃恢复：`status='indexing'` 的残留在上次异常后重跑。
- 空间移除时可选删除索引库。
- 验收：中途取消不损坏 DB；1 万文件索引不卡 UI。

### H. 目录选择器跨平台（P0）
- 抽象 `roots()`：Windows 枚举驱动器，macOS/Linux 从 `/` 与 `$HOME` 起。
- `GET /api/fs` 增加：只允许在"创建空间"流程内调用（一次性 token），或限制为已注册空间的祖先路径。

### I. Watcher（P1）
- `fs.watch` 递归（Windows 支持），去抖 2s，只处理匹配扩展名；默认关，面板可开。
- 与 git 冲突：索引只读不写业务文件，安全。

### J. Embedding（P2，可选模块）
- 配置：`{ enabled, baseUrl, model, apiKeyRef }`，key 走 DSH credentials，不落盘明文。
- 存储：`vectors(chunk_id, dim, blob)` + 余弦；检索用 RRF 融合词法与向量。
- 降级：端点不可用时自动退回纯词法，并在面板标记"向量检索不可用"。
- 成本提示：首次建库需要 N 次请求，面板显示预估。

## 5. 工程化与分发

### 仓库结构
```
dsh-knowledge-space/
├── package.json          # private:false, engines.dsh, files, exports
├── LICENSE               # MIT
├── README.md / README.zh.md
├── CHANGELOG.md
├── CONTRIBUTING.md
├── SECURITY.md
├── docs/DETAIL.md  docs/ROADMAP.md  docs/ARCHITECTURE.md
├── src/…  bench/…  test/…
├── .github/workflows/ci.yml  release.yml
└── cordis.patch.yml  icon.svg  locale/
```

### 测试金字塔
- 单测：tokenize / chunk / rank / path / limits / zip / extract（用脚本生成 docx、xlsx、pdf fixtures，仓库只存生成脚本，二进制不入库）。
- 集成：临时目录建 20 个文件的空间 → 索引 → 断言数量与排序；上传 → 检索；删除 → 移除。
- 客户端：SSR 冒烟（已有）+ 槽位注册断言。
- CI：ubuntu/windows/macos × node 24，`pnpm test` + `node --check` + 中文扫描断言。

### 分发三条路（官方文档口径）
1. **npm（首选）**：纯 ESM 无构建，`pnpm publish` 即得；用户 `dsh plugin add dsh-knowledge-space`。
2. **tarball**：`pnpm pack`，适合内网。
3. **GitHub**：`dsh plugin add github:Lurbing7/dsh-knowledge-space#<sha>`——需要 `prepare` 脚本 + 用户授权构建，不推荐首选。

### 元数据
- `engines.dsh: ">=0.2.2-rc.3 <0.3.0"`（随 0.3 发布前回归再放宽）。
- peer：`@deepseek-ai/cordis`、`@deepseek-ai/schemastery`（若用 Config）。
- 插件索引：`site/index.json` + `icons/` 放 GitHub Pages，用户"发现"页可添加。

## 6. 分阶段

| 阶段 | 内容 | 产出验收 |
|---|---|---|
| **P0 可发布**（发布阻断） | A 通用化、B 英文 UI、C Config、E 安全上限、H 跨平台目录、仓库骨架（LICENSE/CI/README/CHANGELOG）、`private:false` + `engines` | 在干净 profile 里 `dsh plugin add` 成功；CI 三平台绿；英文环境下无中文 |
| **P1 好用** | D 基准+chunk 调优、F 隐私默认、G 生命周期、I watcher、错误报表 | 基准数字入库；取消/异常恢复有测试；1 万文件不卡 |
| **P2 变强** | J embedding + RRF、按目录/标签过滤、检索结果跳转源文件、索引报表 | 混合检索相对纯词法的 MRR 提升可量化 |
| **P3 生态** | 插件索引页、英文文档站、GIF 演示、更多语言、`knowledge_get` 工具、按项目 scope 注入 | 市场可搜到并可安装 |

## 7. 明确不做

- 不做 OCR（扫描件只报告"无文字层"，需要时建议外部先 OCR）。
- 不做云端同步、不做账号体系、不做内容编辑。
- 不默认联网：没有 embedding 配置就永远不发出任何请求。
- 不做向量数据库服务，向量只是本地文件 + 内存计算。

## 8. 待定决策

1. npm 包名与作者署名（`dsh-knowledge-space` 当前可用）。
2. 首发是否中英双语（建议：是）。
3. embedding 放 v1 还是 v1.1（建议：v1.1，先把词法做到可量化）。
4. 仓库公开还是私有。
