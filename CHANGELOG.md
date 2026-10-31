# 版本历史

按语义化版本打标签（`vX.Y.Z`）。

## v0.2.0 — 2026-10-29

**从「往左让」改成「往下让」**

- 补 `data-windows-titlebar` 标记，并把 `--dsh-windows-titlebar-height` 钉成 40px，让宿主自己的 `padding-top` 生效，内容自然落到标题栏下方
- `[data-slot="shell.overlay"]` 改为 `top: 40px; bottom: 0`，工作流画布、插件全屏面板不再压住系统按钮
- 顶部标签行 `min-width: 0` + `flex-wrap: wrap`，放不下就换行，不再滑到按钮底下
- 新增 `guard()` 测量器：只对真的伸进标题栏条带的层做 `margin-top` 推移，推开量 = 重叠量，不重叠自动撤销；启动（0 / 80 / 400 / 1200ms）、resize（120ms 防抖）、DOM 新增（300ms 防抖）时触发
- 不改任何第三方插件源码，也不改宿主文件

## v0.1.0（未入库）

只给会话 header 加 `padding-right: 150px`。宽度让出来了，位置没让 —— 标签行被挤到右边、折行后裁掉半截，看起来更乱。详见 README「0.1 为什么不够」。
