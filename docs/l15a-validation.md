# L15A 验证记录

## 已验证环境

| 项目 | 实测值 |
| --- | --- |
| 验证日期 | 2026-09-23 |
| 部署方式 | macOS + Colima + Home Assistant Container |
| Home Assistant | 2026.9.3 |
| Xiaomi Home | v0.4.7 |
| 设备 | 小米 AI 音箱（第二代） |
| 型号 | `xiaomi.wifispeaker.l15a` |
| 固件 | 1.92.16 |

## 能力确认

L15A 设备页在开启 `Action 调试模式` 后生成了“执行文本指令”Text 实体，参数签名为：

```text
[Text Content(str), Silent Execution(bool)]
```

以下调用成功，小爱 App 对话记录中出现提问与正确时间回答：

```json
["现在几点了", false]
```

提醒指令也被识别为一次性闹钟，并在对话记录中显示目标时间：

```json
["今天晚上八点提醒我测试", false]
```

这表明该设备可以通过 Xiaomi Home 的 Text 实体调用小爱自然语言能力，并创建小爱侧提醒。

## 验证边界

本次没有执行“关闭 Home Assistant 和电脑后等待到点响铃”的完整断链实验。因此已确认的是：

- Home Assistant 能将文本指令交给 L15A。
- 小爱能理解时间问答。
- 提醒指令能生成在 App 中可见的一次性闹钟。

根据闹钟已在小爱侧创建，可以合理预期后续触发不依赖本地 CLI；如需严格证明，仍可创建短期测试闹钟，确认已生成后关闭 Home Assistant，再观察音箱是否按时提醒。

