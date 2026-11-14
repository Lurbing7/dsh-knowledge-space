# 知识空间（dsh-knowledge-space）

把**本地目录**变成 DSH 可检索的知识空间。文件不被复制、不被改写、不上传：插件在旁边建一份 SQLite 索引，你继续用 Obsidian、VS Code 编辑，想同步时点一次「增量索引」。

## 能做什么

**空间就是目录**。Obsidian 库、文档仓库、共享盘、一堆 PDF 的文件夹都行。

**支持格式**

| 格式 | 解析方式 | 引用定位 |
|---|---|---|
| `.md` / `.markdown` | 直接读文本，剥离 YAML frontmatter | 标题路径 |
| `.txt` | 直接读（UTF-8，失败回退 GB18030） | — |
| `.pdf` | 抽取文字层，按页切分 | 标题路径 + `p.N` |
| `.docx` | 解 OOXML，保留标题层级与表格 | 标题路径 |
| `.xlsx` | 逐工作表成块，保留行号 | 工作表名 + 行号 |

旧版 `.doc` / `.xls`、没有文字层的扫描 PDF 会记为解析失败并给出原因，不会静默丢文档。

**检索**：SQLite FTS5 + BM25。中文按双字（bigram）切分，所以「事务」能命中「事务传播」；英文按单词并支持前缀。路径与标题命中额外加权，结果带标题路径、页码/表名和片段。

**给 Agent**：`knowledge_search`、`knowledge_spaces` 两个工具，外加一段可开关的系统提示。默认**不**在每轮对话里强制检索。

**隐私**：全程不联网。命中敏感路径规则的文件（默认 `private`、`.env*`、`*.pem`、`*.key`、`id_rsa*`、`*.kdbx`）在结果里标注 *sensitive*，也可以整个排除出索引。

## 安装

```sh
dsh plugin --profile <名字> add dsh-knowledge-space
```

然后在**插件**页确认 `dsh-knowledge-space` 已启用，重启 DSH，使用左侧栏的「知识空间」。

本地 checkout 安装：

```sh
dsh plugin --profile <名字> add ./dsh-knowledge-space
```

链接安装会用自己的 `node_modules`，先在该目录执行 `pnpm install`，确保 `unpdf`（以及可选的 `@deepseek-ai/schemastery` 开发副本）在位。

## 配置

在 profile 的 `cordis.patch.yml` 中给 `dsh-knowledge-space` 行加 `config`：

```yaml
- id: dsh-knowledge-space
  name: dsh-knowledge-space
  config:
    dataDir: ''
    defaultUploadDir: '_knowledge-space/uploads'
    defaultExcludeDirs: ['.git', '.obsidian', 'node_modules']
    maxFileMB: 30
    promptHint: true
```

每个空间的具体设置（扩展名、排除目录、敏感规则、上传目录、自动提交）在面板里改，落在 `<空间>/.dsh-knowledge-space/space.json`。

## git

- `<空间>/.dsh-knowledge-space/space.json` 与 `manifest.json`（路径 + 内容哈希）建议提交，换设备可复现空间边界。
- SQLite 索引在 `$DSH_HOME/knowledge-space/index/`，不进 git——每次重建都全变。
- 「索引后自动提交」默认关闭；开启后只 `git add`/`commit` `.dsh-knowledge-space/`，**从不 push**。

## 限制

- 每个空间一份索引；超过 `maxFileMB`（30MB）的文件跳过，PDF 超过 `maxPdfPages`、文本超过 `maxDocChars` 会截断。
- 只有词法检索：搜「cache」找不到「缓存」。向量检索在路线图里，尚未实现。
- 面板的 HTTP 接口只接受本机（loopback）连接。
- 需要 Node 24+（`node:sqlite` 在该版本默认可用）；DSH Desktop 自带。

完整说明见 [docs/DETAIL.zh.md](docs/DETAIL.zh.md) · [English README](README.md) · [路线图](docs/ROADMAP.md)

## 许可

MIT
