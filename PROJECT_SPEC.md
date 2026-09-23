# 目标

希望实现这样一套能力：

```text
我在 Codex CLI 中输入：
“今晚 22:30 提醒我洗澡”

↓
Codex 将这条提醒发送给小爱音箱 / 小米云

↓
小爱创建自己的提醒任务

↓
之后即使 Mac 关机、Codex 退出、Node 服务停止

↓
22:30 小爱音箱仍然能够独立提醒：
“该洗澡了”
```

## 核心要求

这里最重要的一点是：

**不能让 Codex、Mac、Node.js、Home Assistant 自己负责等到晚上再执行提醒。**

因为我的电脑晚上可能会关机。

正确目标应该是：

> Codex 只负责在我下达指令时，把一个“未来提醒”写入小爱自身的提醒 / 闹钟系统。

后续提醒由：

* 小米云
* 小爱音箱自身
* 小米的提醒系统

负责执行。

---

# 当前设备

设备：

```text
小米 AI 音箱（第二代）
型号：L15A
```

已经绑定到正常使用的米家 / 小米账号。

---

# 希望优先研究的方案

优先使用小米官方方案：

```text
https://github.com/XiaoMi/ha_xiaomi_home
```

这是小米官方维护的 Home Assistant Xiaomi Home 集成。

重点研究：

```text
Execute Text Directive
Intelligent Speaker Execute Text Directive
Play Text
```

目标是确认：

**L15A 是否支持通过 Xiaomi Home / MIoT 远程执行“小爱文字指令”。**

例如能否发送：

```text
今晚十点半提醒我洗澡
```

相当于人在音箱旁边说：

```text
小爱同学，今晚十点半提醒我洗澡
```

如果可以，就优先走这条链路。

---

# 理想架构

```text
Codex CLI
    ↓
本地 Tool / MCP / Node.js Adapter
    ↓
Home Assistant API
    ↓
Xiaomi Home 官方集成
    ↓
小米 AI 音箱第二代 L15A
    ↓
Execute Text Directive
    ↓
小爱创建原生提醒
```

注意：

Home Assistant 在这里**只作为调用桥梁**。

它不负责：

```text
22:30 再去调用音箱
```

而是应该在创建提醒时立即发送：

```text
“今晚22:30提醒我洗澡”
```

给小爱。

发送成功后，即使 Home Assistant 后续停止运行，也不应影响已经创建好的提醒。

---

# 第一阶段：能力验证

先不要开发完整 Codex MCP。

优先验证设备到底支持什么能力。

## 1. 部署 Home Assistant

可以先在当前 Mac 上部署用于测试。

目标只是测试 Xiaomi Home 集成和 L15A 能力。

不要求长期运行。

---

## 2. 安装官方 Xiaomi Home 集成

项目：

```text
https://github.com/XiaoMi/ha_xiaomi_home
```

按照官方文档完成：

```text
Home Assistant
→ Xiaomi Home
→ 小米账号 OAuth 登录
→ 获取当前米家设备
```

确认能够找到：

```text
小米 AI 音箱（第二代）
L15A
```

---

## 3. 检查 L15A 暴露出来的能力

重点查看：

```text
services
actions
entities
notify entities
miot actions
```

特别关注是否存在：

```text
execute_text_directive
execute text directive
intelligent_speaker
play_text
text directive
```

把实际暴露出来的能力全部记录下来。

不要根据其他音箱型号推测。

必须以 **L15A 实际返回的能力** 为准。

---

## 4. 测试文字指令

如果存在 Execute Text Directive，测试发送：

```text
提醒我五分钟后喝水
```

或者：

```text
五分钟后提醒我喝水
```

最好优先使用静默执行模式。

目标：

1. 音箱不要立即把整条命令朗读出来。
2. 小爱成功创建未来提醒。
3. 关闭 Mac / Home Assistant 后，五分钟后音箱仍然提醒。

这是最重要的验证。

---

# 第二阶段：如果官方集成不支持

如果：

```text
XiaoMi/ha_xiaomi_home
```

没有给 L15A 暴露 Execute Text Directive，

再研究第三方方案：

```text
https://github.com/al-one/hass-xiaomi-miot
```

重点关注：

```text
xiaomi_miot.intelligent_speaker
```

以及类似：

```text
execute: true
```

这种能力。

目标仍然保持不变：

```text
发送一条自然语言指令给小爱
→ 小爱自己创建提醒
```

而不是自己实现定时器。

---

# 第三阶段：如果 Home Assistant 路线仍然不可行

再研究是否存在可以直接调用小爱音箱的 GitHub 项目。

例如可以参考：

```text
https://github.com/E7G/xiaoai-speaker
```

以及其他支持：

```text
Xiaomi AI Speaker
L15A
MIoT
MiNA
xiaoai
```

的项目。

重点判断是否支持：

```text
远程发送文字指令给小爱
```

而不只是：

```text
TTS
播放音乐
调音量
立即播报
```

如果只能立即 TTS，则不符合当前核心需求。

---

# 不希望采用的方案

暂时不要优先考虑：

```text
刷机
xiaoai-patch
修改音箱固件
常驻本地定时任务
Mac LaunchAgent 定时任务
Node setTimeout / cron 等待到晚上
Codex Automation 等待到晚上
```

因为我的核心要求是：

```text
电脑可以关机。
```

---

# 最终希望提供给 Codex 的工具

如果底层验证成功，再封装一个非常简单的 Tool。

例如：

```ts
createXiaoAiReminder({
  text: "今晚22:30提醒我洗澡"
})
```

或者更结构化：

```ts
createXiaoAiReminder({
  time: "22:30",
  content: "洗澡"
})
```

内部转换成：

```text
今晚22:30提醒我洗澡
```

再发送给小爱执行。

---

# Codex CLI 最终使用体验

希望以后直接在 CLI 里输入：

```text
今晚十点提醒我洗澡
```

```text
晚上十一点提醒我睡觉
```

```text
半小时后提醒我把衣服拿出来
```

```text
明天早上八点提醒我带充电器
```

Codex 自动识别这是一个小爱提醒任务，并调用对应 Tool。

---

# 工具设计建议

建议提供一个 Tool：

```ts
xiaoai_create_reminder
```

输入：

```ts
{
  instruction: string
}
```

例如：

```json
{
  "instruction": "今晚十点半提醒我洗澡"
}
```

第一阶段不需要自己解析时间。

直接把完整自然语言发送给小爱，让小爱自己的 NLU 解析。

这样可以最大程度复用小爱的提醒能力。

后面如果需要再做结构化解析。

---

# 成功标准

整个任务只有满足下面条件，才算真正完成。

## 必须满足

```text
1. Codex 能发送提醒指令给小爱。

2. 小爱能够成功创建未来提醒。

3. 创建完成后关闭 Mac。

4. Codex CLI 退出。

5. Home Assistant 停止运行。

6. 到指定时间后，小爱音箱仍正常提醒。
```

如果第 6 条不成立，则说明当前实现只是：

```text
本地定时 + 到点调用音箱
```

这不符合需求。

---

# 当前执行优先级

请按照以下顺序执行：

```text
P0
确认 L15A 在官方 Xiaomi Home 集成中暴露的实际能力。

P1
验证 Execute Text Directive 是否可以创建小爱原生提醒。

P2
验证关闭 Mac / Home Assistant 后提醒仍然有效。

P3
如果官方集成不行，测试 hass-xiaomi-miot。

P4
底层链路确认后，再开发 Codex Tool / MCP。
```

不要一开始就开发大量 Codex 代码。

先把：

```text
L15A → 远程文字指令 → 原生提醒
```

这条最关键链路验证清楚。

---

# 执行过程中请输出

请持续记录：

```text
1. Home Assistant 安装方式
2. Xiaomi Home 集成版本
3. L15A 实际 device model
4. L15A 暴露的 entities
5. L15A 暴露的 services/actions
6. 是否存在 Execute Text Directive
7. 实际调用参数
8. 调用返回结果
9. 米家 / 小爱端是否生成提醒
10. 关闭 Home Assistant 后提醒是否仍然执行
```

如果某一步失败，不要直接更换整个架构。

先明确失败属于：

```text
设备能力不支持
集成未暴露
API 调用错误
账号 / 地区问题
Home Assistant 配置问题
L15A 型号限制
```

然后再决定下一方案。
