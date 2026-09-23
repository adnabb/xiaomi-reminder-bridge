# 安装与配置

本文以 macOS、Colima、Home Assistant Container 和小米 AI 音箱（第二代，L15A）为例。

## 1. 安装运行环境

安装 Node.js 20+、Colima 和 Docker CLI。使用 Homebrew 时可以执行：

```bash
brew install node colima docker docker-compose
```

启动 Docker 环境和 Home Assistant：

```bash
colima start
docker compose up -d
```

Compose 将 Home Assistant 的 `8123` 端口仅绑定到 `127.0.0.1`，同一局域网中的其他设备不能直接访问。

## 2. 初始化 Home Assistant

浏览器打开 <http://127.0.0.1:8123>，创建 Home Assistant 本地管理员账号。

若 macOS 正在使用 Clash 等系统代理，请始终使用 `127.0.0.1`。部分代理环境会导致 `localhost` 页面或 WebSocket 连接失败。

## 3. 安装 Xiaomi Home 集成

按照 [Xiaomi Home 官方仓库](https://github.com/XiaoMi/ha_xiaomi_home) 的说明安装集成，然后在 Home Assistant 中进入：

```text
设置 -> 设备与服务 -> 添加集成 -> Xiaomi Home
```

首次配置建议：

1. 登录地区选择设备实际所在地区，例如中国大陆。
2. 语言选择简体中文。
3. 勾选“集成网络配置”。
4. “网络检测地址”保持为空，勾选“检测网络依赖项”。
5. 完成小米账号 OAuth 登录并选择要导入的家庭。
6. 房间名同步模式按个人偏好选择；只保留米家房间名时选择“房间名”。

如果 OAuth 回调进入 `http://homeassistant.local:8123/...` 或 `http://localhost:8123/...` 后打不开，只替换主机名为 `127.0.0.1`，必须完整保留路径和 `code`、`state` 等查询参数。例如：

```text
http://127.0.0.1:8123/api/webhook/...?...完整参数...
```

OAuth 回调地址包含一次性凭据，不要截图公开或发给他人。

## 4. 配置音箱实体

在 Xiaomi Home 集成的高级设置中建议：

- 控制模式：`自动`
- Action 调试模式：开启
- 隐藏非标准生成实体：关闭
- 二进制传感器显示模式：保持默认
- 设备状态变化通知：保持默认

设备很多时可以启用“筛选设备”，只导入需要控制的音箱。其他选项没有明确需求时保持默认。

进入音箱设备页，在“控制”区域查找“执行文本指令”。实体 ID 通常类似：

```text
text.xiaomi_cn_<device-id>_l15a_execute_text_directive_a_7_4
```

不同设备和集成版本生成的名称可能不同，必须以本机实体详情为准。参数签名应为：

```text
[Text Content(str), Silent Execution(bool)]
```

手工验证时可输入：

```json
["现在几点了", false]
```

其中 `false` 表示允许音箱立即语音回答，`true` 表示静默执行。

## 5. 创建访问令牌

点击 Home Assistant 左下角用户头像，在个人资料页的“长期访问令牌”区域创建一个令牌。令牌只显示一次，不要粘贴到聊天或文档中。

复制项目配置并收紧权限：

```bash
cp .env.example .env.local
chmod 600 .env.local
chmod -R go-rwx home-assistant-config
```

填写 `.env.local`：

```dotenv
HA_URL=http://127.0.0.1:8123
HA_XIAOMI_ENTITY_ID=<执行文本指令实体 ID>
HA_TOKEN=<长期访问令牌>
```

执行只读检查：

```bash
npm run reminder -- --check
```

## 6. 常见问题

### Home Assistant 页面无法打开

先运行 `colima status` 和 `docker compose ps`。代理环境下确认访问的是 `http://127.0.0.1:8123`，而不是 `localhost`。

### 看不到“执行文本指令”

确认 Xiaomi Home 高级设置已开启 `Action 调试模式`。如果仍然没有，该型号可能未提供或未被集成暴露对应 MIoT Action。

### 提示 invalid action params

检查输入是否为严格的 JSON 数组，第二个参数必须是布尔值而不是字符串：

```json
["现在几点了", false]
```

### 发送成功但没有提醒

Home Assistant 接受请求只说明指令已交给集成。可在小爱 App 对话记录或闹钟列表中确认自然语言是否被正确理解。

