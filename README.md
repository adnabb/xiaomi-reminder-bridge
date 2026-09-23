# Xiaomi AI 音箱原生提醒桥接

通过 Home Assistant 的官方 Xiaomi Home 集成，把 Codex 中的自然语言指令发送给小米 AI 音箱（第二代，L15A），由小爱创建原生提醒或一次性闹钟。

```text
Codex CLI
  → 本地 Node.js CLI
  → Home Assistant REST API
  → Xiaomi Home
  → L15A Execute Text Directive
  → 小爱原生提醒
```

本项目不会使用 Node.js、cron、Codex Automation 或 Home Assistant 等待到提醒时间。指令创建成功后，后续触发由小爱侧负责。

## 已验证环境

- macOS + Colima + Docker Compose
- Home Assistant Container `2026.9.3`
- Xiaomi Home 官方集成 `v0.4.7`
- 小米 AI 音箱（第二代）`xiaomi.wifispeaker.l15a`
- Node.js `22.22.1`

设备能力、配置截图和验证记录见 [CAPABILITY_TEST.md](./CAPABILITY_TEST.md)，原始目标见 [PROJECT_SPEC.md](./PROJECT_SPEC.md)。

## 前置条件

1. 安装并启动 Colima 与 Docker CLI。
2. 使用 [compose.yaml](./compose.yaml) 启动 Home Assistant：

   ```bash
   docker compose up -d
   ```

3. 打开 <http://127.0.0.1:8123>，完成 Home Assistant 初始化。
4. 安装 [Xiaomi Home 官方集成](https://github.com/XiaoMi/ha_xiaomi_home)，登录小米账号并导入 L15A。
5. 在 Xiaomi Home 高级配置中开启 `Action 调试模式`，确认设备生成“执行文本指令”Text 实体。

当前 Compose 只把 `8123` 绑定到 `127.0.0.1`，不会向局域网公开 Home Assistant。

## 本地配置

复制示例配置：

```bash
cp .env.example .env.local
chmod 600 .env.local
```

然后填写：

```dotenv
HA_URL=http://127.0.0.1:8123
HA_XIAOMI_ENTITY_ID=text.xiaomi_cn_<device-id>_l15a_execute_text_directive_a_7_4
HA_TOKEN=<Home Assistant 长期访问令牌>
```

长期访问令牌在 Home Assistant 个人资料页创建。不要提交、输出或分享 `.env.local`。

## 使用方式

### 只读检查

验证令牌、Home Assistant 和目标实体，不创建提醒：

```bash
npm run reminder -- --check
```

### 预览提醒

默认只预览，不联网发送：

```bash
npm run reminder -- "今晚十点半提醒我洗澡"
```

### 确认后发送

只有确认指令内容和时间后，才依次执行：

```bash
npm run ha:ensure
npm run reminder -- --send "今晚十点半提醒我洗澡"
```

`ha:ensure` 会先进行只读检查，并在需要时启动 Colima 与 Home Assistant。它会输出本次启动范围：

- `none`：环境原本已运行。
- `home-assistant`：本次启动了 Home Assistant。
- `colima-and-home-assistant`：本次启动了 Colima 与 Home Assistant。

默认使用静默创建。需要音箱立即语音确认时增加 `--audible`：

```bash
npm run reminder -- --send --audible "今晚十点半提醒我洗澡"
```

### 显式确认后关闭

发送确认不包含关闭授权。只有再次明确确认后，才能关闭本次启动的服务。

只关闭 Home Assistant：

```bash
npm run ha:stop -- --home-assistant
```

关闭 Home Assistant，并在没有其他运行中容器时关闭 Colima：

```bash
npm run ha:stop -- --home-assistant-and-colima-if-idle
```

环境原本就在运行时不应执行关闭命令。

快捷口令“关闭小爱提醒”表示关闭本地提醒桥接环境，不是删除已经创建的小爱闹钟。它会执行完整的空闲关闭流程：停止 Home Assistant，并在没有其他运行中容器时停止 Colima。

## Codex Skill

全局 Skill 位于：

```text
~/.codex/skills/xiaoai-reminder/SKILL.md
```

新开 Codex 会话后，可以在任意目录直接提出提醒，也可以显式使用：

```text
$xiaoai-reminder 明天早上八点提醒我带充电器
```

Skill 会先预览并要求发送确认；如果本次启动了运行环境，发送成功后还会单独询问是否关闭。

## 测试

项目不依赖第三方 npm 包，使用 Node.js 内置测试运行器：

```bash
npm test
```

测试只使用模拟 HTTP 和模拟系统命令，不会创建提醒，也不会启动或停止真实容器。

## 安全说明

以下内容均包含敏感信息并已被 Git 忽略：

- `.env.local`：Home Assistant 长期访问令牌和实际实体 ID。
- `home-assistant-config/`：小米 OAuth token、证书、私钥、Home Assistant 认证信息和历史数据。

建议保持：

```bash
chmod 600 .env.local
chmod -R go-rwx home-assistant-config
```

完整实现和操作细节见 [SECOND_PHASE.md](./SECOND_PHASE.md)。
