# Xiaomi AI 音箱原生提醒桥接

通过 Home Assistant 的 Xiaomi Home 集成，把自然语言指令发送给小米 AI 音箱，由小爱创建原生提醒或一次性闹钟。

```text
Codex / Terminal
  -> Node.js CLI
  -> Home Assistant REST API
  -> Xiaomi Home
  -> 小米 AI 音箱
```

本项目只负责立即提交指令，不在本机等待提醒时间。提醒创建后，即使关闭 CLI 和 Home Assistant，也由小爱侧负责后续触发。

> 这是社区项目，与小米、Home Assistant 或 OpenAI 无隶属关系。当前只在小米 AI 音箱（第二代，`xiaomi.wifispeaker.l15a`）上完成验证，其他型号需要自行确认是否提供 `Execute Text Directive` 能力。

## 环境要求

- macOS
- [Colima](https://github.com/abiosoft/colima) 与 Docker CLI（含 Compose）
- Node.js 20 或更高版本
- 已接入米家的兼容小爱音箱

## 快速开始

1. 克隆项目并进入目录：

   ```bash
   git clone <repository-url> xiaomi-reminder-bridge
   cd xiaomi-reminder-bridge
   ```

2. 启动 Colima 和 Home Assistant：

   ```bash
   colima start
   docker compose up -d
   ```

3. 打开 <http://127.0.0.1:8123>，完成 Home Assistant 初始化并安装 [Xiaomi Home](https://github.com/XiaoMi/ha_xiaomi_home)。在集成高级设置中开启 `Action 调试模式`。

4. 复制本地配置：

   ```bash
   cp .env.example .env.local
   chmod 600 .env.local
   ```

5. 在 `.env.local` 中填写 Home Assistant 长期访问令牌和音箱的 `Execute Text Directive` 实体：

   ```dotenv
   HA_URL=http://127.0.0.1:8123
   HA_XIAOMI_ENTITY_ID=text.xiaomi_cn_REPLACE_ME_l15a_execute_text_directive_a_7_4
   HA_TOKEN=REPLACE_WITH_HOME_ASSISTANT_LONG_LIVED_ACCESS_TOKEN
   ```

6. 执行只读检查：

   ```bash
   npm run reminder -- --check
   ```

完整的 Xiaomi Home 页面选项、OAuth 回调处理和实体查找方法见 [安装与配置](docs/setup.md)。

## 创建提醒

先预览，不会发送任何请求：

```bash
npm run reminder -- "今晚十点半提醒我洗澡"
```

确认内容和时间无误后，再确保服务就绪并显式发送：

```bash
npm run ha:ensure
npm run reminder -- --send "今晚十点半提醒我洗澡"
```

默认静默创建，即音箱不会立即播报确认。需要即时语音反馈时增加 `--audible`：

```bash
npm run reminder -- --send --audible "今晚十点半提醒我洗澡"
```

`ha:ensure` 可能输出以下启动范围：

- `none`：环境原本已运行。
- `home-assistant`：本次只启动了 Home Assistant。
- `colima-and-home-assistant`：本次启动了 Colima 和 Home Assistant。

## 关闭本地服务

关闭操作必须显式执行，不会在发送提醒后自动发生。

只停止 Home Assistant：

```bash
npm run ha:stop -- --home-assistant
```

停止 Home Assistant，并在没有其他运行中容器时停止 Colima：

```bash
npm run ha:stop -- --home-assistant-and-colima-if-idle
```

这些命令不会删除已经创建的小爱提醒。第二个命令检测到其他容器时会保留 Colima。

## 与 Codex 配合

从本项目目录启动 Codex 时，[AGENTS.md](AGENTS.md) 会要求它遵守“先预览、用户确认后再发送”的流程，并禁止读取或提交令牌。也可以直接在终端使用上述命令，项目本身不依赖 Codex。

## 测试

```bash
npm test
```

测试使用模拟 HTTP 和模拟系统命令，不会操作真实音箱或容器。

## 文档

- [安装与配置](docs/setup.md)
- [工作原理与安全边界](docs/architecture.md)
- [L15A 验证记录](docs/l15a-validation.md)
- [安全策略](SECURITY.md)

## 敏感数据

`.env.local` 和 `home-assistant-config/` 都被 Git 忽略，前者保存访问令牌，后者可能包含小米 OAuth token、Home Assistant 认证信息、证书和历史数据。不要上传、复制或分享它们。

## 许可证

[MIT](LICENSE)
