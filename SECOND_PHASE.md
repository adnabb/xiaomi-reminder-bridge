# 第二阶段：Codex CLI 调用小爱文字指令

项目级 `AGENTS.md` 已规定 Codex 的确认流程：首次收到提醒请求只能预览，必须取得用户明确确认后才能发送。

## 安全约定

- CLI 默认只预览，不发送请求。
- 只有显式增加 `--send` 才会调用 Home Assistant。
- 长期访问令牌只保存在被 Git 忽略的 `.env.local` 中，不得写入文档、日志或提交记录。
- `home-assistant-config` 与 `.env.local` 均不得分享。

## 1. 创建 Home Assistant 长期访问令牌

1. 使用 `http://127.0.0.1:8123` 打开 Home Assistant。
2. 点击左下角用户名进入个人资料页。
3. 找到“长期访问令牌”，点击“创建令牌”。
4. 名称可填写 `xiaomi-reminder-cli`。
5. 复制只显示一次的令牌，填入 `.env.local` 的 `HA_TOKEN=` 后面。

不要把令牌发送到聊天中。

## 2. 只读检查

填好令牌后，可先验证认证和目标实体。该命令只读取状态，不会创建提醒：

```bash
npm run reminder -- --check
```

## 3. 仅预览

以下命令不会连接 Home Assistant，也不会创建提醒：

```bash
npm run reminder -- "今晚十点半提醒我洗澡"
```

默认参数是静默执行，预览应显示：

```text
模式：仅预览（未发送）
参数：["今晚十点半提醒我洗澡",true]
```

如需让音箱立即语音确认，可使用 `--audible`：

```bash
npm run reminder -- --audible "今晚十点半提醒我洗澡"
```

## 4. 用户确认后实际发送

只有用户检查内容和时间无误后，才先确保 Home Assistant 已启动：

```bash
npm run ha:ensure
```

该命令会先执行只读检查；如果 Home Assistant 不可访问，则按需启动 Colima 和 Home Assistant 容器并等待实体就绪。它本身不会创建提醒。检查成功后才运行：

```bash
npm run reminder -- --send "今晚十点半提醒我洗澡"
```

如果需要语音确认：

```bash
npm run reminder -- --send --audible "今晚十点半提醒我洗澡"
```

Home Assistant 仅在创建提醒时需要在线。小爱侧成功创建原生提醒后，后续提醒不由此 CLI 计时。

## 5. 显式确认后关闭本次启动的服务

如果 `ha:ensure` 返回 `启动范围：none`，说明环境原本就在运行，不应提出或执行关闭。

如果返回 `启动范围：home-assistant`，提醒发送成功后可以询问用户；用户另行确认关闭后执行：

```bash
npm run ha:stop -- --home-assistant
```

如果返回 `启动范围：colima-and-home-assistant`，用户另行确认后执行：

```bash
npm run ha:stop -- --home-assistant-and-colima-if-idle
```

第二条命令只会在没有其他运行中容器时停止 Colima。提醒发送确认不等于关闭授权，不能默认自动关闭。

快捷口令“关闭小爱提醒”本身视为完整关闭授权，直接执行第二条命令。这个口令只关闭本地桥接环境，不删除小爱中已经创建的提醒或闹钟。
