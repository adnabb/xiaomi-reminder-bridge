# 项目协作规则

## 通用开发原则

- 编写或修改代码时，优先采用满足需求的最小改动，避免无关重构、额外抽象和扩大改动范围。
- 对包含多个独立阶段的代码任务，在每个阶段完成并通过对应验证后进行阶段性提交；每次提交仅包含该阶段相关改动，避免混入未完成或无关变更。

## 小爱提醒操作规则

- 本项目通过 Home Assistant 的 Xiaomi Home 集成，将完整自然语言指令立即交给小爱；不得使用本地定时器、cron、Codex Automation 或 Node.js 等待到提醒时间。
- 用户说“关闭小爱提醒”时，含义固定为关闭本地提醒桥接环境，不是删除已经创建的小爱闹钟。该短语本身就是明确的关闭授权，直接执行：

  ```bash
  npm run ha:stop -- --home-assistant-and-colima-if-idle
  ```

  此命令停止 Home Assistant，并且仅在没有其他运行中容器时停止 Colima；无需再次询问。若 Colima 本来就未运行，报告环境已经关闭。
- 用户首次提出提醒请求时，只能运行预览命令：

  ```bash
  npm run reminder -- "<完整自然语言指令>"
  ```

- 预览后必须向用户展示完整指令、静默参数和目标时间，并等待用户明确确认。
- 只有用户明确表达“确认发送”“现在创建”或同等授权后，才允许运行：

  ```bash
  npm run ha:ensure
  npm run reminder -- --send "<完整自然语言指令>"
  ```

- `npm run ha:ensure` 只允许在用户确认发送后运行。它会只读检查 Home Assistant，并在需要时启动 Colima 与 Home Assistant；它本身不得发送设备指令。
- 如果 `npm run ha:ensure` 失败，不得继续运行 `--send`，应报告错误并停止。
- 根据 `ha:ensure` 输出的“启动范围”决定是否提出关闭：`none` 时不得提出；`home-assistant` 或 `colima-and-home-assistant` 时，提醒发送成功后可以询问用户是否关闭本次启动的服务。
- 发送提醒的确认不包含关闭服务的授权。只有用户随后明确确认关闭，才允许运行以下对应命令：

  ```bash
  npm run ha:stop -- --home-assistant
  npm run ha:stop -- --home-assistant-and-colima-if-idle
  ```

- 不得关闭原本已经运行的 Home Assistant 或 Colima。关闭 Colima 前必须确保没有其他运行中的 Docker 容器；由 `ha:stop` 脚本执行该检查。

- 不得因为用户仅提供了提醒内容就自行推定发送授权。
- 若时间、日期或内容有歧义，必须先澄清，不得发送。
- 默认使用静默执行；只有用户明确要求音箱立即语音反馈时才增加 `--audible`。
- 可以运行 `npm run reminder -- --check` 做只读连接检查；该命令不得变更设备状态。
- 不得读取、输出、复制或提交 `.env.local` 中的 `HA_TOKEN`。
- 不得把 `.env.local` 或 `home-assistant-config` 加入 Git、上传或分享。
