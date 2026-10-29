# dsh-ui-repair

Windows 标题栏让位补丁。**不改任何第三方插件的源码，也不改宿主文件。**

## 它解决什么

DSH 在 Windows 上自绘标题栏（Electron `titleBarOverlay`）：最小化 / 最大化 / 关闭三个按钮由 Electron 直接画在网页**上方**的右上角。网页放在那个位置的东西点不到——点击会命中窗口按钮，命中 ✕ 就是关窗口。

| 现象 | 原因 |
|---|---|
| 顶部视图标签行（对话 / 轨迹 / Swarm / 上下文…）压在窗口按钮上，点一下就关窗口 | 标签行向右长进标题栏条带 |
| 工作流画布、插件全屏面板打开后，自己的「发布 / ✕」和系统按钮重叠 | 浮层从 `top:0` 开始，没给标题栏让位 |
| 某个嵌入页（插件自己渲染的整页）里所有内容都顶到 y=0 | 该文档没有 `data-windows-titlebar` 标记，宿主那条 `padding-top` 规则失效 |

## 0.1 为什么不够

0.1 只做了一件事：给会话 header 加 `padding-right: 150px`。结果是标签行被挤到右边、折行后被裁掉半截——宽度被让出来了，但位置没让出来，看起来更乱。**让位要往下让，不是往左让。**

## 0.2 做了什么

三条规则 + 一个小测量器：

1. **补标记**：如果当前文档是 Electron + Windows 却没有 `data-windows-titlebar`，补上，并把 `--dsh-windows-titlebar-height` 钉成 40px。宿主的 frame 自己就有 `padding-top: var(--dsh-windows-titlebar-height)`，标记一补，内容自然落到标题栏下方。
2. **浮层让位**：`[data-slot="shell.overlay"]` 改为 `top: 40px; bottom: 0`。
3. **标签行可折行**：`min-width: 0` + `flex-wrap: wrap`，放不下就换行，不再滑到按钮底下。
4. **测量器**（`guard()`）：对 `conversation.session.header`、`shell.overlay`、`main`、`rightbar`、`[role=dialog]` 及其直接子元素做一次 `getBoundingClientRect`——**只有真的伸进标题栏条带的层**才被 `margin-top` 推开，推开量 = 重叠量；不再重叠就自动撤销。不会造成反复跳动：每次测量都会先减去自己上次的推移量。

触发时机：启动（0、80、400、1200ms 四次，等布局稳定）、窗口 resize（120ms 防抖）、DOM 新增（300ms 防抖，覆盖后来才打开的工作流画布）。

## 边界

- 只在 `Windows + Electron` 生效；macOS / 纯 Web 完全不介入。
- 只推「占屏 ≥40% 宽 且 ≥30% 高」的层，小气泡、tooltip、菜单不动。
- 40px 是 Windows 11 的默认标题栏高度；`--dsh-windows-titlebar-height` 存在时以宿主变量为准。
- 如果 DSH 以后自己修好了避让，本插件不会叠加错误偏移（测量器发现不重叠就不动），此时也可以直接关掉。

## 怎么关

在 `cordis.patch.yml` 里给这一行加 `disabled: true`，或从 `dsh.profile.bundles` 移除。关掉后布局立刻恢复——它没有改过任何文件。

## 它不做什么

- 不改第三方插件代码，不改宿主文件。
- 不注册路由、命令、工具，host 侧是空的。
- 不做主题、不做布局改造，只处理「窗口按钮压住页面」这一件事。
