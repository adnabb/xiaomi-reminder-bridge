# 工作原理与安全边界

## 请求链路

```text
自然语言指令
  -> scripts/xiaomi-directive.mjs
  -> Home Assistant text.set_value
  -> Xiaomi Home Execute Text Directive
  -> 小爱自然语言理解
  -> 原生提醒 / 一次性闹钟
```

CLI 不解析提醒日期，也不创建本地定时任务。它把完整自然语言即时交给小爱，因此“明天早上八点提醒我带充电器”等时间语义由小爱解释。

## 安全护栏

- 默认命令只预览；只有 `--send` 才会写入 Home Assistant。
- `--check` 只读取目标实体状态。
- 默认静默执行，避免远程调用时音箱立刻播报。
- Home Assistant 端口只绑定 `127.0.0.1`。
- 服务关闭范围必须显式选择。
- Colima 仅在没有其他运行中容器时才会被关闭。
- 凭据保存在被 Git 忽略的 `.env.local` 和 `home-assistant-config/` 中。
- 项目级 `AGENTS.md` 为 Codex 增加“预览后再次确认”的操作约束。

## 文件职责

```text
compose.yaml                         Home Assistant 容器配置
scripts/xiaomi-directive.mjs         检查、预览和发送指令
scripts/ensure-home-assistant.mjs    按需启动运行环境
scripts/stop-home-assistant.mjs      显式、安全地关闭运行环境
test/                                无真实副作用的单元测试
.env.local                           本地凭据，不进入 Git
home-assistant-config/               HA 数据目录，不进入 Git
```

## 信任边界

Home Assistant 配置目录可能保存小米 OAuth token、Home Assistant 用户认证信息、设备标识、证书、日志与历史数据。能够读取该目录或 `.env.local` 的本地用户，可能取得对 Home Assistant 或已关联设备的访问能力。

建议仅在可信电脑运行，保持磁盘加密，不向公网暴露 `8123`，并定期轮换长期访问令牌。若怀疑仓库或配置被泄露，应立即在 Home Assistant 撤销令牌，并在 Xiaomi Home 中重新授权。

## 非目标

- 不提供公网远程访问。
- 不运行本地 cron、Node.js 定时器或 Codex Automation。
- 不保证所有小爱音箱型号都支持文本指令。
- 不负责查询、修改或删除已经创建的闹钟。

