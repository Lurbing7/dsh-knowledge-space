window.__ModuleLoader__.load({
  id: 'dsh-knowledge-space',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useState, useEffect, useCallback, useRef, useMemo } = React;
    const NS = 'dsh-knowledge-space';

    /* ------------------------------------------------------------ messages */

    const MESSAGES = {
      en: {
        'title': 'Knowledge spaces',
        'subtitle': 'Turn local folders into searchable knowledge for DSH',
        'newSpace': 'New space',
        'missing': 'missing',
        'tab.overview': 'Overview',
        'tab.docs': 'Documents',
        'tab.search': 'Search',
        'tab.settings': 'Settings',
        'empty.title': 'No knowledge space yet',
        'empty.body':
          'Pick a local folder (an Obsidian vault, a docs repo, a shared drive). Nothing is copied or rewritten — the plugin keeps a side index, so you can keep editing files anywhere and press "Reindex" to sync.',
        'empty.hint':
          'Markdown, TXT, PDF, Word (.docx) and Excel (.xlsx) are indexed. .git, .obsidian, .system, node_modules and similar folders are skipped by default.',
        'empty.cta': 'Choose a folder',
        'stat.documents': 'Documents',
        'stat.chunks': 'Chunks',
        'stat.indexSize': 'Index size',
        'stat.lastIndex': 'Last index',
        'stat.never': 'never',
        'stat.duration': '{s}s',
        'action.incremental': 'Incremental reindex',
        'action.full': 'Full rebuild',
        'action.indexing': 'Indexing…',
        'phase.scan': 'Scanning',
        'phase.queued': 'Queued',
        'phase.manifest': 'Writing manifest',
        'phase.done': 'Done',
        'phase.error': 'Failed',
        'import.title': 'Add documents',
        'import.subtitle': 'Files are copied to {dir} and indexed automatically',
        'import.drop': 'Drop files here, or',
        'import.files': 'Choose files',
        'import.folder': 'Choose folder',
        'import.hint': 'Supports .md .txt .pdf .docx .xlsx; folders keep their relative paths',
        'import.uploading': 'Uploading {done}/{total}',
        'import.failed': '{n} failed',
        'git.title': 'Git',
        'git.subtitle': 'Space config and manifest are versioned with the repo; the index stays local',
        'git.commit': 'Commit manifest',
        'git.branch': 'Branch',
        'git.lastCommit': 'Last commit',
        'git.sync': 'Sync',
        'git.pluginChanges': 'Plugin files',
        'git.dirty': 'Repository changes',
        'git.clean': 'clean',
        'git.pending': '{n} to commit',
        'git.unavailable': 'Not a git repository: {reason}',
        'git.autoOn': 'Auto-commit is on: only this space’s .dsh-knowledge-space/ is committed. Never pushes.',
        'errors.count': '{n} file(s) failed to parse (legacy .doc/.xls, scanned PDFs). Filter by status=error in Documents.',
        'docs.title': 'Indexed documents',
        'docs.count': '{n} documents',
        'docs.filter': 'Filter by path…',
        'docs.all': 'All statuses',
        'docs.ok': 'OK',
        'docs.error': 'Parse error',
        'docs.failed': 'Failed',
        'docs.chunks': '{n} chunks',
        'docs.none': 'No matching documents.',
        'docs.more': 'Load more',
        'docs.close': 'Close',
        'docs.updated': '{n} chunks · updated {time}',
        'tag.sensitive': 'sensitive',
        'search.title': 'Search test',
        'search.subtitle': 'Local FTS5 lexical search: BM25 ranking, Chinese bigrams, path and heading boosts',
        'search.placeholder': 'Keywords, e.g. spring transaction rollback',
        'search.go': 'Search',
        'search.running': 'Searching…',
        'search.hits': '{n} results',
        'search.like': 'The index did not match; fell back to a substring scan.',
        'search.mode': 'Mode: {mode}',
        'search.none': 'No hits. Try shorter keywords, or reindex first.',
        'search.score': 'score {n}',
        'settings.title': 'Space settings',
        'settings.save': 'Save',
        'settings.saving': 'Saving…',
        'settings.name': 'Display name',
        'settings.root': 'Space folder',
        'settings.rootHint': 'Fixed after creation; create another space to change it',
        'settings.uploadDir': 'Upload folder',
        'settings.uploadDirHint': 'Relative to the space folder; uploaded files land here and are always indexed',
        'settings.exts': 'Indexed extensions',
        'settings.extsHint': 'Comma separated: md markdown txt pdf docx xlsx',
        'settings.excludes': 'Excluded folders',
        'settings.excludesHint': 'One per line, relative to the space folder; a prefix match skips the folder',
        'settings.sensitive': 'Sensitive path patterns',
        'settings.sensitiveHint': 'One per line; a bare name matches any path segment, * is supported',
        'settings.indexSensitive': 'Index sensitive paths',
        'settings.indexSensitiveHint': 'Results are marked "sensitive" either way',
        'settings.autoCommit': 'Commit manifest after indexing',
        'settings.autoCommitHint': 'Only git add/commit this space’s .dsh-knowledge-space/. Never pushes.',
        'settings.agent': 'Agent access',
        'settings.promptHint': 'Tell the model which spaces exist',
        'settings.promptHintHint': 'The tools work either way; this only adds a system prompt section',
        'settings.toolsHint': 'Tools: knowledge_search (search), knowledge_spaces (list). Saved on the server immediately.',
        'settings.danger': 'Danger zone',
        'settings.dangerBody': 'Removing a space deletes its index and registry entry. No file inside the folder is touched, and git history is unchanged.',
        'settings.remove': 'Remove this space',
        'settings.confirmRemove': 'Remove "{name}"? Only the index and registry entry are deleted.',
        'create.title': 'New knowledge space',
        'create.body': 'Pick a local folder. The plugin never copies or rewrites the files inside it.',
        'create.path': 'Folder path',
        'create.browse': 'Browse…',
        'create.pathHint': 'Or paste a path',
        'create.name': 'Display name (optional)',
        'create.namePlaceholder': 'Defaults to the folder name',
        'create.cancel': 'Cancel',
        'create.go': 'Create space',
        'create.creating': 'Creating…',
        'browse.title': 'Choose a folder',
        'browse.up': '↑ Parent',
        'browse.empty': 'No subfolders',
        'browse.pick': 'Choose this folder',
        'browse.thisPC': 'This computer',
        'error.generic': '{message}',
        'error.space_not_found': 'Knowledge space not found.',
        'error.directory_missing': 'That folder does not exist.',
        'error.space_exists': 'That folder is already a knowledge space.',
        'error.invalid_upload_path': 'Upload path must stay inside the upload folder.',
        'error.payload_too_large': 'File is too large.',
        'error.index_in_progress': 'This space is indexing already.',
        'error.unknown_route': 'Unknown endpoint.',
        'notice.indexing': 'Indexing started.',
        'notice.rebuilding': 'Full rebuild started; progress updates live.',
        'notice.committed': 'Committed: {detail}',
        'notice.nothing': 'Nothing to commit.',
      },
      zh: {
        'title': '知识空间',
        'subtitle': '把本地文档目录变成 DSH 可检索的知识空间',
        'newSpace': '新建空间',
        'missing': '目录缺失',
        'tab.overview': '概览',
        'tab.docs': '文档',
        'tab.search': '检索',
        'tab.settings': '设置',
        'empty.title': '还没有知识空间',
        'empty.body':
          '指定一个本地目录（Obsidian 库、文档仓库、共享盘都行）。插件不复制、不改写文件，只在旁边建索引；你在任何编辑器里改完，回来点一次「增量索引」即可同步。',
        'empty.hint':
          '默认索引 Markdown、TXT、PDF、Word（.docx）、Excel（.xlsx），并跳过 .git、.obsidian、.system、node_modules 等目录。',
        'empty.cta': '选择目录，建立空间',
        'stat.documents': '文档',
        'stat.chunks': '分块',
        'stat.indexSize': '索引体积',
        'stat.lastIndex': '上次索引',
        'stat.never': '从未',
        'stat.duration': '{s}s',
        'action.incremental': '增量索引',
        'action.full': '全量重建',
        'action.indexing': '索引中…',
        'phase.scan': '扫描目录',
        'phase.queued': '排队中',
        'phase.manifest': '写入清单',
        'phase.done': '完成',
        'phase.error': '失败',
        'import.title': '导入文档',
        'import.subtitle': '文件会复制到 {dir}，随后自动增量索引',
        'import.drop': '把文件拖到这里，或',
        'import.files': '选择文件',
        'import.folder': '选择文件夹',
        'import.hint': '支持 .md .txt .pdf .docx .xlsx；文件夹会保留相对路径',
        'import.uploading': '上传中 {done}/{total}',
        'import.failed': '失败 {n}',
        'git.title': 'git 管理',
        'git.subtitle': '空间配置与清单随仓库版本化；索引库留在本机，不进入 git',
        'git.commit': '立即提交清单',
        'git.branch': '分支',
        'git.lastCommit': '最近提交',
        'git.sync': '同步状态',
        'git.pluginChanges': '插件目录变更',
        'git.dirty': '整库未提交',
        'git.clean': '干净',
        'git.pending': '{n} 个文件待提交',
        'git.unavailable': '该目录不是 git 仓库：{reason}',
        'git.autoOn': '已开启「索引后自动提交」：只提交该空间的 .dsh-knowledge-space/，不会 push。',
        'errors.count': '{n} 个文件解析失败（旧版 .doc/.xls、扫描版 PDF 等）。可在「文档」页筛选 status=error 查看原因。',
        'docs.title': '已索引文档',
        'docs.count': '{n} 篇',
        'docs.filter': '按路径过滤…',
        'docs.all': '全部状态',
        'docs.ok': '正常',
        'docs.error': '解析失败',
        'docs.failed': '解析失败',
        'docs.chunks': '{n} 段',
        'docs.none': '没有匹配的文档。',
        'docs.more': '加载更多',
        'docs.close': '关闭',
        'docs.updated': '{n} 段 · 更新于 {time}',
        'tag.sensitive': '私密',
        'search.title': '检索测试',
        'search.subtitle': '本地 FTS5 词法检索：BM25 排序，中文按双字切分，路径与标题额外加权',
        'search.placeholder': '输入关键词，例如：Spring 事务 失效',
        'search.go': '检索',
        'search.running': '检索中…',
        'search.hits': '结果 {n} 条',
        'search.like': '词法索引未命中，已回退为子串扫描',
        'search.mode': '命中模式：{mode}',
        'search.none': '没有命中。试试更短的关键词，或先重建索引。',
        'search.score': '得分 {n}',
        'settings.title': '空间设置',
        'settings.save': '保存',
        'settings.saving': '保存中…',
        'settings.name': '显示名称',
        'settings.root': '空间目录',
        'settings.rootHint': '创建后不可更改；要换目录请新建空间',
        'settings.uploadDir': '上传目录',
        'settings.uploadDirHint': '相对于空间目录；上传的文件复制到这里，并始终参与索引',
        'settings.exts': '索引扩展名',
        'settings.extsHint': '逗号分隔：md markdown txt pdf docx xlsx',
        'settings.excludes': '排除目录',
        'settings.excludesHint': '每行一个，相对空间根目录；命中前缀即跳过',
        'settings.sensitive': '敏感路径规则',
        'settings.sensitiveHint': '每行一个；不带斜杠的名称匹配任意层级，支持 *',
        'settings.indexSensitive': '索引敏感路径',
        'settings.indexSensitiveHint': '无论如何，检索结果都会标注「私密」',
        'settings.autoCommit': '索引后自动提交清单',
        'settings.autoCommitHint': '只 git add/commit 该空间的 .dsh-knowledge-space/，不会 push',
        'settings.agent': 'Agent 接入',
        'settings.promptHint': '在系统提示中告知知识空间',
        'settings.promptHintHint': '工具本身不受影响，这里只控制是否注入一段说明',
        'settings.toolsHint': '工具：knowledge_search（检索）、knowledge_spaces（列空间）。保存后服务端立即生效。',
        'settings.danger': '危险操作',
        'settings.dangerBody': '移除空间只删除索引与本机登记，不会删除目录里的任何文件，也不会改动 git 历史。',
        'settings.remove': '移除这个知识空间',
        'settings.confirmRemove': '移除空间「{name}」？只删除索引与登记。',
        'create.title': '新建知识空间',
        'create.body': '选择一个本地目录。插件不会复制或改写里面的文件。',
        'create.path': '目录路径',
        'create.browse': '浏览目录…',
        'create.pathHint': '也可以直接粘贴路径',
        'create.name': '显示名称（可选）',
        'create.namePlaceholder': '默认取目录名',
        'create.cancel': '取消',
        'create.go': '创建空间',
        'create.creating': '创建中…',
        'browse.title': '选择目录',
        'browse.up': '⬆ 上一级',
        'browse.empty': '没有子目录',
        'browse.pick': '选择这个目录',
        'browse.thisPC': '此电脑',
        'error.generic': '{message}',
        'error.space_not_found': '知识空间不存在。',
        'error.directory_missing': '目录不存在。',
        'error.space_exists': '该目录已经是知识空间。',
        'error.invalid_upload_path': '上传路径必须位于上传目录内。',
        'error.payload_too_large': '文件太大。',
        'error.index_in_progress': '该空间正在索引，请等待完成。',
        'error.unknown_route': '未知接口。',
        'notice.indexing': '已开始增量索引。',
        'notice.rebuilding': '已开始全量重建，进度会实时刷新。',
        'notice.committed': '已提交：{detail}',
        'notice.nothing': '没有需要提交的变更。',
      },
    };

    function localeId(locale) {
      try {
        const snapshot = locale?.getLocale?.() ?? locale?.getSnapshot?.();
        const active = snapshot?.active ?? snapshot?.id ?? '';
        return String(active).toLowerCase().startsWith('zh') ? 'zh' : 'en';
      } catch {
        return 'en';
      }
    }

    function makeTranslate(bag) {
      return (key, vars) => {
        const template = bag[key] ?? MESSAGES.en[key] ?? key;
        if (!vars) return template;
        return template.replace(/\{(\w+)\}/g, (whole, name) => (vars[name] === undefined ? whole : String(vars[name])));
      };
    }

    /** Subscribes to the locale service so a language switch re-renders the panel. */
    function useTranslate(locale) {
      const [id, setId] = useState(() => localeId(locale));
      useEffect(() => {
        if (!locale?.subscribe) return undefined;
        const update = () => setId(localeId(locale));
        update();
        return locale.subscribe(update);
      }, [locale]);
      return useMemo(() => makeTranslate(MESSAGES[id] ?? MESSAGES.en), [id]);
    }

    /* ---------------------------------------------------------------- api */

    function ApiError(payload, status) {
      const error = new Error(payload?.error || `Request failed (${status})`);
      error.code = payload?.code;
      return error;
    }

    async function api(path, options = {}) {
      const response = await fetch(`/dsh-knowledge-space/${path}`, {
        headers: options.body ? { 'content-type': 'application/json' } : undefined,
        ...options,
      });
      let data = {};
      try {
        data = await response.json();
      } catch {
        data = {};
      }
      if (!response.ok) throw ApiError(data, response.status);
      return data;
    }

    function describeError(t, error) {
      const code = error?.code;
      if (code && t(`error.${code}`) !== `error.${code}`) return t(`error.${code}`);
      return t('error.generic', { message: error?.message ?? String(error) });
    }

    function fmtBytes(bytes) {
      const n = Number(bytes) || 0;
      if (n < 1024) return `${n} B`;
      if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
      return `${(n / 1024 / 1024).toFixed(1)} MB`;
    }

    function fmtTime(iso) {
      if (!iso) return '—';
      const date = new Date(iso);
      if (Number.isNaN(date.getTime())) return iso;
      const pad = (value) => String(value).padStart(2, '0');
      return `${date.getMonth() + 1}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }

    function escapeRegExp(text) {
      return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function Highlight({ text, terms }) {
      const list = (terms || []).filter(Boolean).slice(0, 20);
      if (list.length === 0) return h(React.Fragment, null, text);
      const pattern = new RegExp(`(${list.map(escapeRegExp).sort((a, b) => b.length - a.length).join('|')})`, 'gi');
      const parts = String(text).split(pattern);
      return h(
        React.Fragment,
        null,
        parts.map((part, index) => (index % 2 === 1 ? h('mark', { key: index, className: 'ks-mark' }, part) : part)),
      );
    }

    /* --------------------------------------------------------------- atoms */

    function Button({ children, onClick, disabled, variant = 'outline', size = 'md', title }) {
      return h(
        'button',
        { className: `ks-btn ks-btn-${variant} ks-btn-${size}`, onClick, disabled, title, type: 'button' },
        children,
      );
    }

    /**
     * A page section: 20px title, 13px description, controls on the right.
     * Mirrors the host's settings sections rather than a floating card.
     */
    function Section({ title, subtitle, actions, children }) {
      return h(
        'section',
        { className: 'ks-section' },
        (title || actions) &&
          h(
            'div',
            { className: 'ks-section-head' },
            h(
              'div',
              { className: 'ks-section-titles' },
              title && h('h2', { className: 'ks-section-title' }, title),
              subtitle && h('p', { className: 'ks-section-sub' }, subtitle),
            ),
            actions && h('div', { className: 'ks-section-actions' }, actions),
          ),
        h('div', { className: 'ks-section-body' }, children),
      );
    }

    const Card = Section;

    function Stat({ label, value, hint }) {
      return h(
        'div',
        { className: 'ks-stat' },
        h('div', { className: 'ks-stat-value' }, value),
        h('div', { className: 'ks-stat-label' }, label),
        hint && h('div', { className: 'ks-stat-hint' }, hint),
      );
    }

    function Field({ label, hint, children }) {
      return h(
        'label',
        { className: 'ks-field' },
        h('span', { className: 'ks-field-label' }, label),
        children,
        hint && h('span', { className: 'ks-field-hint' }, hint),
      );
    }

    function Toggle({ checked, onChange, label, hint }) {
      return h(
        'div',
        { className: 'ks-toggle-row' },
        h('div', null, h('div', { className: 'ks-toggle-label' }, label), hint && h('div', { className: 'ks-field-hint' }, hint)),
        h(
          'button',
          {
            type: 'button',
            role: 'switch',
            'aria-checked': checked ? 'true' : 'false',
            'aria-label': label,
            className: `ks-switch ${checked ? 'is-on' : ''}`,
            onClick: () => onChange(!checked),
          },
          h('span', { className: 'ks-switch-dot' }),
        ),
      );
    }

    function Progress({ job, t }) {
      if (!job) return null;
      const total = Number(job.total) || 0;
      const done = Number(job.done) || 0;
      const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : job.running ? 6 : 100;
      const phase = job.phase ? t(`phase.${job.phase}`) : '';
      return h(
        'div',
        { className: 'ks-progress' },
        h(
          'div',
          { className: 'ks-progress-head' },
          h('span', null, `${phase}${job.running ? ` · ${done}/${total}` : ''}`),
          total > 0 && h('span', { className: 'ks-muted' }, `${pct}%`),
        ),
        h('div', { className: 'ks-progress-track' }, h('div', { className: 'ks-progress-bar', style: { width: `${pct}%` } })),
        job.current && job.running && h('div', { className: 'ks-progress-current' }, job.current),
        job.error && h('div', { className: 'ks-error-text' }, job.error),
      );
    }

    /* --------------------------------------------------------------- page */

    function App({ locale }) {
      const t = useTranslate(locale);
      const [spaces, setSpaces] = useState([]);
      const [selectedId, setSelectedId] = useState(null);
      const [tab, setTab] = useState('overview');
      const [error, setError] = useState('');
      const [notice, setNotice] = useState('');
      const [creating, setCreating] = useState(false);
      const [loaded, setLoaded] = useState(false);

      const refresh = useCallback(async () => {
        const data = await api('api/spaces');
        setSpaces(data.spaces || []);
        setSelectedId((current) => {
          if (current && (data.spaces || []).some((space) => space.id === current)) return current;
          return data.spaces?.[0]?.id ?? null;
        });
        setLoaded(true);
        return data.spaces || [];
      }, []);

      useEffect(() => {
        refresh().catch((err) => setError(describeError(t, err)));
      }, [refresh]);

      const running = spaces.some((space) => space.job?.running);
      useEffect(() => {
        if (!running) return undefined;
        const timer = setTimeout(() => refresh().catch(() => {}), 1400);
        return () => clearTimeout(timer);
      }, [running, spaces, refresh]);

      const space = useMemo(() => spaces.find((item) => item.id === selectedId) ?? spaces[0] ?? null, [spaces, selectedId]);

      const run = useCallback(
        async (action, fallbackMessage) => {
          setError('');
          setNotice('');
          try {
            await action();
            await refresh();
          } catch (err) {
            setError(fallbackMessage ? `${fallbackMessage}: ${describeError(t, err)}` : describeError(t, err));
          }
        },
        [refresh, t],
      );

      const reindex = (mode) =>
        run(async () => {
          await api('api/spaces/reindex', { method: 'POST', body: JSON.stringify({ id: space.id, mode }) });
          setNotice(mode === 'full' ? t('notice.rebuilding') : t('notice.indexing'));
        });

      const commit = () =>
        run(async () => {
          const result = await api('api/space/git-commit', {
            method: 'POST',
            body: JSON.stringify({ id: space.id }),
          });
          setNotice(result.committed ? t('notice.committed', { detail: result.detail.split('\n')[0] }) : t('notice.nothing'));
        });

      return h(
        'section',
        { className: 'ks-page', 'aria-label': t('title') },
        h('style', null, CSS),
        h(
          'div',
          { className: 'ks-scroll' },
          h(
            'div',
            { className: 'ks-content' },
            h(
              'div',
              { className: 'ks-heading' },
              h('h1', { className: 'ks-heading-title' }, t('title')),
              h(
                'div',
                { className: 'ks-heading-actions' },
                spaces.length > 0 &&
                  h(
                    'select',
                    {
                      className: 'ks-select ks-select-sm',
                      'aria-label': t('title'),
                      value: space?.id ?? '',
                      onChange: (event) => setSelectedId(event.target.value),
                    },
                    spaces.map((item) =>
                      h('option', { key: item.id, value: item.id }, `${item.name}${item.missing ? ` (${t('missing')})` : ''}`),
                    ),
                  ),
                h(Button, { variant: 'primary', onClick: () => setCreating(true) }, t('newSpace')),
              ),
            ),
            h(
              'div',
              { className: 'ks-tabs', role: 'tablist' },
              ['overview', 'docs', 'search', 'settings'].map((id) =>
                h(
                  'button',
                  {
                    key: id,
                    type: 'button',
                    role: 'tab',
                    'aria-selected': tab === id ? 'true' : 'false',
                    className: `ks-tab ${tab === id ? 'is-active' : ''}`,
                    onClick: () => setTab(id),
                    disabled: !space,
                  },
                  t(`tab.${id}`),
                ),
              ),
            ),
            error && h('div', { className: 'ks-banner ks-banner-error' }, error),
            notice && h('div', { className: 'ks-banner ks-banner-ok' }, notice),
            !loaded && h('div', { className: 'ks-muted' }, '…'),
            loaded && !space && h(EmptyState, { t, onCreate: () => setCreating(true) }),
            space && tab === 'overview' && h(Overview, { space, reindex, commit, refresh, setError, setNotice, t }),
            space && tab === 'docs' && h(Docs, { space, t }),
            space && tab === 'search' && h(Search, { space, t }),
            space && tab === 'settings' && h(Settings, { space, refresh, run, setTab, t }),
          ),
        ),
        creating &&
          h(CreateSpace, {
            t,
            onClose: () => setCreating(false),
            onCreated: (id) => {
              setCreating(false);
              setTab('overview');
              setSelectedId(id);
              refresh().catch(() => {});
            },
          }),
      );
    }

    function EmptyState({ t, onCreate }) {
      return h(
        Card,
        { title: t('empty.title') },
        h(
          'div',
          { className: 'ks-empty' },
          h('p', null, t('empty.body')),
          h('p', { className: 'ks-muted' }, t('empty.hint')),
          h(Button, { variant: 'primary', onClick: onCreate }, t('empty.cta')),
        ),
      );
    }

    /* ----------------------------------------------------------- overview */

    function Overview({ space, reindex, commit, refresh, setError, setNotice, t }) {
      const counts = space.counts || { files: 0, chunks: 0, errors: 0 };
      const job = space.job || {};
      const git = space.git || {};
      const [dropActive, setDropActive] = useState(false);
      const [uploading, setUploading] = useState(null);
      const fileRef = useRef(null);
      const folderRef = useRef(null);

      const upload = async (files) => {
        if (!files || files.length === 0) return;
        setError('');
        setNotice('');
        setUploading({ total: files.length, done: 0, current: '', failed: 0 });
        let failed = 0;
        for (let index = 0; index < files.length; index += 1) {
          const file = files[index];
          const rel = (file.webkitRelativePath || file.name || '').replace(/\\/g, '/');
          setUploading({ total: files.length, done: index, current: rel, failed });
          try {
            const response = await fetch(
              `/dsh-knowledge-space/api/space/upload?id=${encodeURIComponent(space.id)}&path=${encodeURIComponent(rel)}`,
              { method: 'POST', body: file },
            );
            if (!response.ok) throw ApiError(await response.json().catch(() => ({})), response.status);
          } catch (err) {
            failed += 1;
            setError(`${rel}: ${describeError(t, err)}`);
          }
        }
        setUploading({ total: files.length, done: files.length, current: '', failed });
        setTimeout(() => refresh().catch(() => {}), 600);
        setTimeout(() => setUploading(null), 2500);
      };

      const onDrop = (event) => {
        event.preventDefault();
        setDropActive(false);
        upload(Array.from(event.dataTransfer?.files ?? []));
      };

      return h(
        React.Fragment,
        null,
        h(
          Card,
          {
            title: space.name,
            subtitle: space.root,
            actions: h(
              React.Fragment,
              null,
              h(Button, { onClick: () => reindex('incremental'), disabled: job.running }, job.running ? t('action.indexing') : t('action.incremental')),
              h(Button, { onClick: () => reindex('full'), disabled: job.running, variant: 'ghost' }, t('action.full')),
            ),
          },
          space.missing && h('div', { className: 'ks-banner ks-banner-error' }, t('error.directory_missing')),
          h(
            'div',
            { className: 'ks-stats' },
            h(Stat, { label: t('stat.documents'), value: counts.files }),
            h(Stat, { label: t('stat.chunks'), value: counts.chunks }),
            h(Stat, { label: t('stat.indexSize'), value: fmtBytes(space.indexBytes) }),
            h(Stat, {
              label: t('stat.lastIndex'),
              value: space.lastIndexedAt ? fmtTime(space.lastIndexedAt) : t('stat.never'),
              hint: space.lastIndexMs ? t('stat.duration', { s: (space.lastIndexMs / 1000).toFixed(1) }) : '',
            }),
          ),
          h(Progress, { job, t }),
          counts.errors > 0 && h('div', { className: 'ks-warn' }, t('errors.count', { n: counts.errors })),
        ),
        h(
          Card,
          { title: t('import.title'), subtitle: t('import.subtitle', { dir: space.uploadDir }) },
          h(
            'div',
            {
              className: `ks-drop ${dropActive ? 'is-active' : ''}`,
              onDragOver: (event) => {
                event.preventDefault();
                setDropActive(true);
              },
              onDragLeave: () => setDropActive(false),
              onDrop,
            },
            h('div', { className: 'ks-drop-title' }, t('import.drop')),
            h(
              'div',
              { className: 'ks-drop-actions' },
              h(Button, { size: 'sm', onClick: () => fileRef.current?.click() }, t('import.files')),
              h(Button, { size: 'sm', onClick: () => folderRef.current?.click(), variant: 'ghost' }, t('import.folder')),
            ),
            h('div', { className: 'ks-field-hint' }, t('import.hint')),
          ),
          h('input', {
            ref: fileRef,
            type: 'file',
            multiple: true,
            accept: '.md,.markdown,.txt,.pdf,.docx,.xlsx',
            style: { display: 'none' },
            onChange: (event) => {
              upload(Array.from(event.target.files ?? []));
              event.target.value = '';
            },
          }),
          h('input', {
            ref: (element) => {
              folderRef.current = element;
              if (element) element.setAttribute('webkitdirectory', '');
            },
            type: 'file',
            multiple: true,
            style: { display: 'none' },
            onChange: (event) => {
              upload(Array.from(event.target.files ?? []));
              event.target.value = '';
            },
          }),
          uploading &&
            h(
              'div',
              { className: 'ks-progress' },
              h(
                'div',
                { className: 'ks-progress-head' },
                h('span', null, t('import.uploading', { done: uploading.done, total: uploading.total })),
                uploading.failed > 0 && h('span', { className: 'ks-error-text' }, t('import.failed', { n: uploading.failed })),
              ),
              h(
                'div',
                { className: 'ks-progress-track' },
                h('div', {
                  className: 'ks-progress-bar',
                  style: { width: `${Math.round((uploading.done / Math.max(1, uploading.total)) * 100)}%` },
                }),
              ),
              uploading.current && h('div', { className: 'ks-progress-current' }, uploading.current),
            ),
        ),
        h(
          Card,
          { title: t('git.title'), subtitle: t('git.subtitle'), actions: h(Button, { size: 'sm', onClick: commit, disabled: !git.available }, t('git.commit')) },
          git.available
            ? h(
                'div',
                { className: 'ks-kv' },
                h('div', null, h('span', { className: 'ks-kv-key' }, t('git.branch')), h('span', null, git.branch || '—')),
                h('div', null, h('span', { className: 'ks-kv-key' }, t('git.lastCommit')), h('span', { className: 'ks-mono' }, git.head || '—')),
                h('div', null, h('span', { className: 'ks-kv-key' }, t('git.sync')), h('span', null, git.aheadBehind || '—')),
                h('div', null, h('span', { className: 'ks-kv-key' }, t('git.pluginChanges')), h('span', null, git.ourChanges > 0 ? t('git.pending', { n: git.ourChanges }) : t('git.clean'))),
                h('div', null, h('span', { className: 'ks-kv-key' }, t('git.dirty')), h('span', null, String(git.dirty ?? '—'))),
              )
            : h('div', { className: 'ks-muted' }, t('git.unavailable', { reason: git.reason || '' })),
          space.autoCommit && h('div', { className: 'ks-muted ks-small' }, t('git.autoOn')),
        ),
      );
    }

    /* --------------------------------------------------------------- docs */

    function Docs({ space, t }) {
      const [filter, setFilter] = useState('');
      const [status, setStatus] = useState('');
      const [rows, setRows] = useState([]);
      const [total, setTotal] = useState(0);
      const [offset, setOffset] = useState(0);
      const [selected, setSelected] = useState(null);
      const [detail, setDetail] = useState(null);
      const [error, setError] = useState('');
      const limit = 80;

      const load = useCallback(
        async (nextOffset) => {
          try {
            const params = new URLSearchParams({ id: space.id, q: filter, status, limit: String(limit), offset: String(nextOffset) });
            const data = await api(`api/space/docs?${params}`);
            setRows((current) => (nextOffset === 0 ? data.rows : current.concat(data.rows)));
            setTotal(data.total);
            setOffset(nextOffset);
          } catch (err) {
            setError(describeError(t, err));
          }
        },
        [space.id, filter, status, t],
      );

      useEffect(() => {
        load(0);
      }, [load]);

      useEffect(() => {
        if (!selected) {
          setDetail(null);
          return;
        }
        api(`api/space/doc?id=${encodeURIComponent(space.id)}&rel=${encodeURIComponent(selected)}`)
          .then(setDetail)
          .catch((err) => setError(describeError(t, err)));
      }, [selected, space.id, t]);

      return h(
        React.Fragment,
        null,
        h(
          Card,
          {
            title: t('docs.title'),
            subtitle: t('docs.count', { n: total }),
            actions: h(
              React.Fragment,
              null,
              h('input', { className: 'ks-input ks-input-sm', placeholder: t('docs.filter'), value: filter, onChange: (event) => setFilter(event.target.value) }),
              h(
                'select',
                { className: 'ks-select ks-select-sm', value: status, onChange: (event) => setStatus(event.target.value) },
                h('option', { value: '' }, t('docs.all')),
                h('option', { value: 'ok' }, t('docs.ok')),
                h('option', { value: 'error' }, t('docs.error')),
              ),
            ),
          },
          error && h('div', { className: 'ks-banner ks-banner-error' }, error),
          h(
            'div',
            { className: 'ks-table' },
            rows.map((row) =>
              h(
                'button',
                {
                  key: row.rel,
                  type: 'button',
                  className: `ks-row ${selected === row.rel ? 'is-active' : ''}`,
                  onClick: () => setSelected(selected === row.rel ? null : row.rel),
                },
                h('span', { className: 'ks-row-main' }, row.rel, row.sensitive ? h('span', { className: 'ks-tag' }, t('tag.sensitive')) : null),
                h('span', { className: 'ks-row-meta' }, row.status === 'error' ? h('span', { className: 'ks-error-text' }, t('docs.failed')) : t('docs.chunks', { n: row.chunks })),
                h('span', { className: 'ks-row-meta ks-muted' }, fmtBytes(row.bytes)),
              ),
            ),
          ),
          rows.length === 0 && h('div', { className: 'ks-muted' }, t('docs.none')),
          rows.length < total && h(Button, { variant: 'ghost', onClick: () => load(offset + limit) }, t('docs.more')),
        ),
        detail &&
          h(
            Card,
            {
              title: detail.doc.rel,
              subtitle: t('docs.updated', { n: detail.doc.chunks, time: fmtTime(new Date(detail.doc.updated).toISOString()) }),
              actions: h(Button, { size: 'sm', variant: 'ghost', onClick: () => setSelected(null) }, t('docs.close')),
            },
            detail.doc.status === 'error' && h('div', { className: 'ks-banner ks-banner-error' }, detail.doc.err || t('docs.failed')),
            detail.chunks.map((chunk) =>
              h(
                'div',
                { key: chunk.id, className: 'ks-chunk' },
                h(
                  'div',
                  { className: 'ks-chunk-head' },
                  chunk.heading && h('span', { className: 'ks-chunk-title' }, chunk.heading),
                  chunk.locator && h('span', { className: 'ks-tag' }, chunk.locator),
                  h('span', { className: 'ks-muted ks-small' }, `#${chunk.ord + 1}`),
                ),
                h('pre', { className: 'ks-chunk-body' }, chunk.text),
              ),
            ),
          ),
      );
    }

    /* ------------------------------------------------------------- search */

    function Search({ space, t }) {
      const [query, setQuery] = useState('');
      const [limit, setLimit] = useState(8);
      const [result, setResult] = useState(null);
      const [busy, setBusy] = useState(false);
      const [error, setError] = useState('');

      const submit = async () => {
        if (query.trim() === '') return;
        setBusy(true);
        setError('');
        try {
          const params = new URLSearchParams({ id: space.id, q: query, limit: String(limit) });
          setResult(await api(`api/space/search?${params}`));
        } catch (err) {
          setError(describeError(t, err));
        } finally {
          setBusy(false);
        }
      };

      return h(
        React.Fragment,
        null,
        h(
          Card,
          { title: t('search.title'), subtitle: t('search.subtitle') },
          h(
            'div',
            { className: 'ks-searchbar' },
            h('input', {
              className: 'ks-input',
              placeholder: t('search.placeholder'),
              value: query,
              onChange: (event) => setQuery(event.target.value),
              onKeyDown: (event) => {
                if (event.key === 'Enter') submit();
              },
            }),
            h(
              'select',
              { className: 'ks-select ks-select-sm', value: limit, onChange: (event) => setLimit(Number(event.target.value)) },
              [5, 8, 12, 20].map((n) => h('option', { key: n, value: n }, String(n))),
            ),
            h(Button, { variant: 'primary', onClick: submit, disabled: busy }, busy ? t('search.running') : t('search.go')),
          ),
          error && h('div', { className: 'ks-banner ks-banner-error' }, error),
        ),
        result &&
          h(
            Card,
            {
              title: t('search.hits', { n: result.results.length }),
              subtitle: result.mode === 'like' ? t('search.like') : t('search.mode', { mode: result.mode }),
            },
            result.results.length === 0 && h('div', { className: 'ks-muted' }, t('search.none')),
            result.results.map((item, index) =>
              h(
                'article',
                { key: `${item.rel}-${index}`, className: 'ks-hit' },
                h(
                  'div',
                  { className: 'ks-hit-head' },
                  h('span', { className: 'ks-hit-path' }, h(Highlight, { text: item.rel, terms: result.terms })),
                  item.sensitive && h('span', { className: 'ks-tag' }, t('tag.sensitive')),
                  item.locator && h('span', { className: 'ks-tag' }, item.locator),
                  h('span', { className: 'ks-muted ks-small' }, t('search.score', { n: item.score })),
                ),
                item.heading && h('div', { className: 'ks-hit-heading' }, h(Highlight, { text: item.heading, terms: result.terms })),
                h('p', { className: 'ks-hit-snippet' }, h(Highlight, { text: item.snippet, terms: result.terms })),
              ),
            ),
          ),
      );
    }

    /* ----------------------------------------------------------- settings */

    function Settings({ space, refresh, run, setTab, t }) {
      const [form, setForm] = useState(() => formOf(space));
      const [promptHint, setPromptHint] = useState(true);
      const [saving, setSaving] = useState(false);

      useEffect(() => setForm(formOf(space)), [space.id, space.name, space.uploadDir, space.autoCommit, space.includeSensitive]);

      useEffect(() => {
        api('api/settings')
          .then((data) => setPromptHint(data.settings?.promptHint !== false))
          .catch(() => {});
      }, []);

      const save = async () => {
        setSaving(true);
        await run(async () => {
          await api('api/spaces/update', {
            method: 'POST',
            body: JSON.stringify({
              id: space.id,
              patch: {
                name: form.name,
                uploadDir: form.uploadDir,
                includeExts: form.includeExts.split(/[,，\s]+/).filter(Boolean),
                excludeDirs: splitLines(form.excludeDirs),
                sensitivePaths: splitLines(form.sensitivePaths),
                includeSensitive: form.includeSensitive,
                autoCommit: form.autoCommit,
              },
            }),
          });
          await api('api/settings', { method: 'POST', body: JSON.stringify({ promptHint }) });
        });
        setSaving(false);
      };

      const forget = async () => {
        if (!window.confirm(t('settings.confirmRemove', { name: space.name }))) return;
        await run(async () => {
          await api('api/spaces/forget', { method: 'POST', body: JSON.stringify({ id: space.id }) });
          setTab('overview');
        });
      };

      return h(
        React.Fragment,
        null,
        h(
          Card,
          { title: t('settings.title'), actions: h(Button, { variant: 'primary', onClick: save, disabled: saving }, saving ? t('settings.saving') : t('settings.save')) },
          h(
            'div',
            { className: 'ks-form' },
            h(Field, { label: t('settings.name') }, h('input', { className: 'ks-input', value: form.name, onChange: (e) => setForm({ ...form, name: e.target.value }) })),
            h(Field, { label: t('settings.root'), hint: t('settings.rootHint') }, h('input', { className: 'ks-input', value: space.root, readOnly: true, disabled: true })),
            h(Field, { label: t('settings.uploadDir'), hint: t('settings.uploadDirHint') }, h('input', { className: 'ks-input', value: form.uploadDir, onChange: (e) => setForm({ ...form, uploadDir: e.target.value }) })),
            h(Field, { label: t('settings.exts'), hint: t('settings.extsHint') }, h('input', { className: 'ks-input', value: form.includeExts, onChange: (e) => setForm({ ...form, includeExts: e.target.value }) })),
            h(Field, { label: t('settings.excludes'), hint: t('settings.excludesHint') }, h('textarea', { className: 'ks-textarea', rows: 6, value: form.excludeDirs, onChange: (e) => setForm({ ...form, excludeDirs: e.target.value }) })),
            h(Field, { label: t('settings.sensitive'), hint: t('settings.sensitiveHint') }, h('textarea', { className: 'ks-textarea', rows: 4, value: form.sensitivePaths, onChange: (e) => setForm({ ...form, sensitivePaths: e.target.value }) })),
            h(Toggle, { label: t('settings.indexSensitive'), hint: t('settings.indexSensitiveHint'), checked: form.includeSensitive, onChange: (value) => setForm({ ...form, includeSensitive: value }) }),
            h(Toggle, { label: t('settings.autoCommit'), hint: t('settings.autoCommitHint'), checked: form.autoCommit, onChange: (value) => setForm({ ...form, autoCommit: value }) }),
          ),
        ),
        h(
          Card,
          { title: t('settings.agent') },
          h(Toggle, { label: t('settings.promptHint'), hint: t('settings.promptHintHint'), checked: promptHint, onChange: setPromptHint }),
          h('div', { className: 'ks-muted ks-small' }, t('settings.toolsHint')),
        ),
        h(
          Card,
          { title: t('settings.danger') },
          h('p', { className: 'ks-muted' }, t('settings.dangerBody')),
          h(Button, { variant: 'danger', onClick: forget }, t('settings.remove')),
        ),
      );
    }

    function formOf(space) {
      return {
        name: space.name,
        uploadDir: space.uploadDir,
        includeExts: (space.includeExts || []).join(', '),
        excludeDirs: (space.excludeDirs || []).join('\n'),
        sensitivePaths: (space.sensitivePaths || []).join('\n'),
        includeSensitive: space.includeSensitive !== false,
        autoCommit: Boolean(space.autoCommit),
      };
    }

    function splitLines(text) {
      return String(text ?? '')
        .split(/\r?\n|,|，/)
        .map((line) => line.trim())
        .filter(Boolean);
    }

    /* ------------------------------------------------------- create space */

    function CreateSpace({ t, onClose, onCreated }) {
      const [path, setPath] = useState('');
      const [name, setName] = useState('');
      const [browsing, setBrowsing] = useState(false);
      const [busy, setBusy] = useState(false);
      const [error, setError] = useState('');

      const create = async () => {
        setBusy(true);
        setError('');
        try {
          const data = await api('api/spaces', { method: 'POST', body: JSON.stringify({ path, name }) });
          onCreated(data.space.id);
        } catch (err) {
          setError(describeError(t, err));
        } finally {
          setBusy(false);
        }
      };

      return h(
        'div',
        { className: 'ks-modal-backdrop', onClick: onClose },
        h(
          'div',
          { className: 'ks-modal', onClick: (event) => event.stopPropagation() },
          h('h2', { className: 'ks-modal-title' }, t('create.title')),
          h('p', { className: 'ks-muted ks-small' }, t('create.body')),
          error && h('div', { className: 'ks-banner ks-banner-error' }, error),
          h(Field, { label: t('create.path') }, h('input', { className: 'ks-input', value: path, placeholder: 'C:\\workspace\\notes', onChange: (e) => setPath(e.target.value) })),
          h(
            'div',
            { className: 'ks-inline' },
            h(Button, { onClick: () => setBrowsing(true) }, t('create.browse')),
            h('span', { className: 'ks-muted ks-small' }, t('create.pathHint')),
          ),
          h(Field, { label: t('create.name') }, h('input', { className: 'ks-input', value: name, placeholder: t('create.namePlaceholder'), onChange: (e) => setName(e.target.value) })),
          h(
            'div',
            { className: 'ks-modal-actions' },
            h(Button, { variant: 'ghost', onClick: onClose }, t('create.cancel')),
            h(Button, { variant: 'primary', onClick: create, disabled: busy || path.trim() === '' }, busy ? t('create.creating') : t('create.go')),
          ),
          browsing &&
            h(DirectoryBrowser, {
              t,
              initial: path,
              onClose: () => setBrowsing(false),
              onPick: (picked) => {
                setPath(picked);
                setBrowsing(false);
              },
            }),
        ),
      );
    }

    function DirectoryBrowser({ t, initial, onClose, onPick }) {
      const [current, setCurrent] = useState(initial || '');
      const [data, setData] = useState({ dirs: [], parent: null });
      const [error, setError] = useState('');

      const load = useCallback(
        async (target) => {
          try {
            const result = await api(`api/fs?path=${encodeURIComponent(target || '')}`);
            setData(result);
            setCurrent(result.path);
            setError('');
          } catch (err) {
            setError(describeError(t, err));
          }
        },
        [t],
      );

      useEffect(() => {
        load(initial || '');
      }, [initial, load]);

      return h(
        'div',
        { className: 'ks-modal-backdrop' },
        h(
          'div',
          { className: 'ks-modal ks-modal-browser' },
          h('h2', { className: 'ks-modal-title' }, t('browse.title')),
          h('div', { className: 'ks-pathbar' }, current || t('browse.thisPC')),
          error && h('div', { className: 'ks-banner ks-banner-error' }, error),
          h(
            'div',
            { className: 'ks-dirlist' },
            data.parent !== null && data.parent !== undefined && h('button', { type: 'button', className: 'ks-diritem', onClick: () => load(data.parent) }, t('browse.up')),
            data.dirs.map((dir) => h('button', { key: dir.path, type: 'button', className: 'ks-diritem', onClick: () => load(dir.path) }, dir.name)),
            data.dirs.length === 0 && h('div', { className: 'ks-muted' }, t('browse.empty')),
          ),
          h(
            'div',
            { className: 'ks-modal-actions' },
            h(Button, { variant: 'ghost', onClick: onClose }, t('create.cancel')),
            h(Button, { variant: 'primary', onClick: () => current && onPick(current), disabled: !current }, t('browse.pick')),
          ),
        ),
      );
    }

    /* --------------------------------------------------------------- icon */

    function SidebarIcon({ size, active }) {
      const edge = typeof size === 'number' ? size : 20;
      return h(
        'svg',
        { width: edge, height: edge, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true', style: { display: 'block' } },
        h('path', {
          d: 'M4 5.5A1.5 1.5 0 0 1 5.5 4h4l1.6 2H18.5A1.5 1.5 0 0 1 20 7.5v10a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5v-12Z',
          stroke: 'currentColor',
          strokeWidth: active ? 1.9 : 1.6,
          strokeLinejoin: 'round',
        }),
        h('path', { d: 'M8.2 12.2h7.6M8.2 15.4h4.6', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', opacity: 0.85 }),
      );
    }

    /* ---------------------------------------------------------------- css */

    const CSS = `
      /* Page shell: matches the host's management pages (960 max width,
         clamp insets, 28px heading inset, 14px/1.6 base). */
      .ks-page { display: flex; width: 100%; height: 100%; min-width: 0; min-height: 0; overflow: hidden; background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); font-size: 14px; line-height: 1.6; }
      .ks-scroll { flex: 1; min-height: 0; overflow: auto; scrollbar-gutter: stable; }
      .ks-content { max-width: 960px; margin: 0 auto; padding: 0 clamp(24px, 4vw, 48px) 48px; }
      .ks-heading { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; padding-top: 28px; margin-bottom: 20px; }
      .ks-heading-title { flex: 0 1 auto; min-width: 0; margin: 0; font-size: 20px; line-height: 28px; font-weight: 500; }
      .ks-heading-actions { display: flex; align-items: center; gap: 8px; }

      /* Section-level tabs as the host's pill chips, not an underdrawn tab bar. */
      .ks-tabs { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 20px; }
      .ks-tab { display: inline-flex; flex: none; align-items: center; height: 28px; padding: 0 10px; border: 0; border-radius: 14px; background: transparent; color: var(--dsw-alias-label-tertiary); font: inherit; font-size: 14px; line-height: 22px; white-space: nowrap; cursor: pointer; }
      .ks-tab:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
      .ks-tab.is-active { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
      .ks-tab:disabled { opacity: .45; cursor: default; }

      /* Sections are divided by a hairline, the way host settings group content. */
      .ks-section { padding: 20px 0; border-top: 0.5px solid var(--dsw-alias-border-l1); }
      .ks-section:first-of-type { padding-top: 0; border-top: 0; }
      .ks-section-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
      .ks-section-titles { min-width: 0; }
      .ks-section-title { margin: 0; font-size: 16px; line-height: 24px; font-weight: 500; }
      .ks-section-sub { margin: 4px 0 0; font-size: 13px; line-height: 21px; color: var(--dsw-alias-label-tertiary); word-break: break-all; }
      .ks-section-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }

      .ks-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 36px; padding: 0 14px; border: 0.5px solid transparent; border-radius: 10px; background: transparent; color: var(--dsw-alias-label-primary); font: inherit; font-size: 14px; line-height: 22px; cursor: pointer; }
      .ks-btn-sm { height: 28px; padding: 0 10px; font-size: 13px; border-radius: 8px; }
      .ks-btn-outline { border-color: var(--dsw-alias-border-l3); }
      .ks-btn-outline:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }
      .ks-btn-ghost { color: var(--dsw-alias-label-secondary); }
      .ks-btn-ghost:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
      .ks-btn-primary { background: var(--dsw-alias-brand-primary); color: #fff; }
      .ks-btn-primary:hover:not(:disabled) { background: var(--dsw-alias-brand-primary); opacity: .92; }
      .ks-btn-danger { border-color: var(--dsw-alias-state-error-primary); color: var(--dsw-alias-state-error-primary); }
      .ks-btn-danger:hover:not(:disabled) { background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent); }
      .ks-btn:disabled { opacity: .45; cursor: default; }

      .ks-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.5px; margin-bottom: 14px; border: 0.5px solid var(--dsw-alias-border-l1); border-radius: 12px; overflow: hidden; background: var(--dsw-alias-border-l1); }
      .ks-stat { background: var(--dsw-alias-bg-layer-1); padding: 12px 14px; }
      .ks-stat-value { font-size: 20px; line-height: 28px; font-weight: 500; }
      .ks-stat-label { font-size: 13px; line-height: 21px; color: var(--dsw-alias-label-tertiary); }
      .ks-stat-hint { font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }

      .ks-progress { margin-top: 12px; display: flex; flex-direction: column; gap: 6px; }
      .ks-progress-head { display: flex; justify-content: space-between; font-size: 13px; line-height: 21px; color: var(--dsw-alias-label-tertiary); }
      .ks-progress-track { height: 4px; border-radius: 999px; background: var(--dsw-alias-bg-layer-2); overflow: hidden; }
      .ks-progress-bar { height: 100%; background: var(--dsw-alias-brand-primary); transition: width .25s ease; }
      .ks-progress-current { font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); word-break: break-all; }

      .ks-banner { border-radius: 12px; padding: 10px 12px; font-size: 13px; line-height: 21px; margin-bottom: 16px; }
      .ks-banner-error { background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent); color: var(--dsw-alias-state-error-primary); }
      .ks-banner-ok { background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 10%, transparent); color: var(--dsw-alias-state-success-primary); }

      .ks-muted { color: var(--dsw-alias-label-tertiary); }
      .ks-small { font-size: 12px; line-height: 18px; }
      .ks-mono { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 12px; }
      .ks-error-text { color: var(--dsw-alias-state-error-primary); }
      .ks-warn { margin-top: 10px; font-size: 13px; line-height: 21px; color: var(--dsw-alias-state-warn-primary); }

      .ks-drop { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 24px 16px; border: 0.5px dashed var(--dsw-alias-border-l2); border-radius: 12px; text-align: center; }
      .ks-drop.is-active { border-color: var(--dsw-alias-brand-primary); background: color-mix(in srgb, var(--dsw-alias-brand-primary) 6%, transparent); }
      .ks-drop-title { font-size: 13px; color: var(--dsw-alias-label-tertiary); }
      .ks-drop-actions { display: flex; gap: 8px; }

      .ks-kv { display: flex; flex-direction: column; gap: 8px; font-size: 13px; line-height: 21px; }
      .ks-kv > div { display: flex; gap: 12px; }
      .ks-kv-key { flex: 0 0 110px; color: var(--dsw-alias-label-tertiary); }

      .ks-input, .ks-select, .ks-textarea { box-sizing: border-box; height: 36px; padding: 0 10px; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: 12px; background: transparent; color: var(--dsw-alias-label-primary); font: inherit; font-size: 14px; line-height: 22px; outline: none; }
      .ks-input::placeholder, .ks-textarea::placeholder { color: var(--dsw-alias-label-tertiary); }
      .ks-input:focus, .ks-select:focus, .ks-textarea:focus { border-color: var(--dsw-alias-brand-primary); }
      .ks-input-sm, .ks-select-sm { height: 32px; font-size: 13px; border-radius: 10px; }
      .ks-input-sm { width: 180px; }
      .ks-textarea { height: auto; padding: 8px 10px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 13px; line-height: 21px; resize: vertical; }

      .ks-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
      .ks-field-label { font-size: 13px; line-height: 21px; color: var(--dsw-alias-label-secondary); }
      .ks-field-hint { font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }
      .ks-form { max-width: 620px; }

      .ks-toggle-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px 0; border-top: 0.5px solid var(--dsw-alias-border-l1); }
      .ks-toggle-label { font-size: 14px; line-height: 22px; }
      .ks-switch { position: relative; width: 40px; height: 22px; padding: 0; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: 999px; background: var(--dsw-alias-bg-layer-2); cursor: pointer; }
      .ks-switch.is-on { background: var(--dsw-alias-brand-primary); border-color: transparent; }
      .ks-switch-dot { position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 999px; background: #fff; transition: transform .16s ease; }
      .ks-switch.is-on .ks-switch-dot { transform: translateX(18px); }

      .ks-table { display: flex; flex-direction: column; gap: 2px; max-height: 420px; overflow-y: auto; }
      .ks-row { display: flex; align-items: center; gap: 12px; width: 100%; padding: 8px; border: 0; border-radius: 10px; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
      .ks-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
      .ks-row.is-active { background: var(--dsw-alias-interactive-bg-hover); }
      .ks-row-main { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .ks-row-meta { flex-shrink: 0; font-size: 13px; line-height: 21px; color: var(--dsw-alias-label-tertiary); }

      .ks-tag { display: inline-flex; align-items: center; height: 20px; margin-left: 6px; padding: 0 8px; border: 0.5px solid var(--dsw-alias-border-l1); border-radius: 10px; color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; }

      .ks-chunk { padding: 12px 0; border-top: 0.5px solid var(--dsw-alias-border-l1); }
      .ks-chunk-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 13px; line-height: 21px; }
      .ks-chunk-title { font-weight: 500; }
      .ks-chunk-body { max-height: 220px; margin: 0; overflow-y: auto; white-space: pre-wrap; word-break: break-word; font-family: inherit; font-size: 13px; line-height: 21px; color: var(--dsw-alias-label-secondary); }

      .ks-searchbar { display: flex; align-items: center; gap: 8px; }
      .ks-searchbar .ks-input { flex: 1; min-width: 0; }

      .ks-hit { padding: 12px 0; border-top: 0.5px solid var(--dsw-alias-border-l1); }
      .ks-hit-head { display: flex; align-items: center; gap: 8px; font-size: 13px; line-height: 21px; }
      .ks-hit-path { font-weight: 500; word-break: break-all; }
      .ks-hit-heading { margin-top: 2px; font-size: 13px; line-height: 21px; color: var(--dsw-alias-label-tertiary); }
      .ks-hit-snippet { margin: 6px 0 0; font-size: 13px; line-height: 22px; }
      .ks-mark { padding: 0 1px; border-radius: 3px; background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 22%, transparent); color: inherit; }

      .ks-empty { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 48px 20px; text-align: center; color: var(--dsw-alias-label-tertiary); }
      .ks-empty p { max-width: 60ch; margin: 0; font-size: 14px; line-height: 1.6; }
      .ks-empty .ks-btn { margin-top: 4px; }
      .ks-inline { display: flex; align-items: center; gap: 10px; margin: -8px 0 16px; }

      .ks-modal-backdrop { position: fixed; inset: 0; z-index: 60; display: flex; align-items: center; justify-content: center; padding: 24px; background: var(--dsw-alias-bg-mask-1, rgba(0, 0, 0, .4)); backdrop-filter: var(--dsw-mask-blur, blur(2px)); }
      .ks-modal { display: flex; flex-direction: column; gap: 10px; width: min(520px, 100%); padding: 20px 22px; border-radius: var(--dsw-radius-panel, 16px); background: var(--dsw-alias-bg-layer-2); box-shadow: var(--dsw-elevation-prominent, 0 24px 64px rgba(0, 0, 0, .3)); }
      .ks-modal-title { margin: 0; font-size: 16px; line-height: 24px; font-weight: 500; }
      .ks-modal-browser { width: min(640px, 100%); }
      .ks-modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
      .ks-pathbar { padding: 8px 10px; border-radius: 10px; background: var(--dsw-alias-bg-layer-1); font-size: 12px; line-height: 18px; word-break: break-all; color: var(--dsw-alias-label-secondary); }
      .ks-dirlist { display: flex; flex-direction: column; gap: 1px; max-height: 320px; overflow-y: auto; }
      .ks-diritem { padding: 7px 9px; border: 0; border-radius: 8px; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
      .ks-diritem:hover { background: var(--dsw-alias-interactive-bg-hover); }
    `;

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        try {
          ctx.locale.register(NS, 'en', MESSAGES.en);
          ctx.locale.register(NS, 'zh', MESSAGES.zh);
        } catch {
          /* a locale pack may already own this namespace; the panel still renders */
        }
        const locale = ctx.locale;
        const label = () => (localeId(locale) === 'zh' ? '知识空间' : 'Knowledge spaces');
        ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: NS }, () => h(App, { locale })));
        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register({ name: 'sidebar.panellist', id: NS, order: 12, label }, SidebarIcon),
        );
      },
    };
  },
});
