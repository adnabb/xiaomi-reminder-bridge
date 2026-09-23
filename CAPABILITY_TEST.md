# L15A 原生提醒能力验证记录

## 固定环境

- 部署方式：macOS + Colima + Home Assistant Container
- Home Assistant 地址：<http://127.0.0.1:8123>
- Xiaomi Home 集成：官方 `XiaoMi/ha_xiaomi_home` v0.4.7
- 测试日期：2026-09-23

> `home-assistant-config` 含 OAuth token、设备信息等敏感数据，已加入 `.gitignore`，不要上传或分享。

### 本机访问说明

当前 Mac 的 Clash/系统代理环境下，浏览器访问 `http://localhost:8123` 会出现页面无法访问或 Home Assistant WebSocket 无法连接。应统一使用：

```text
http://127.0.0.1:8123
```

如果小米 OAuth 自动回跳到 `http://localhost:8123/?auth_callback=...`，只将地址中的 `localhost` 改成 `127.0.0.1`，其余查询参数必须完整保留，然后重新访问。

## P0：检查 L15A 实际能力

1. 完成 Home Assistant 首次初始化。
2. 进入“设置 → 设备与服务 → 添加集成”，搜索 `Xiaomi Home`。
3. 使用小米账号 OAuth 登录，选择 L15A 所在家庭及正确地区。
4. 进入“Xiaomi Home → 配置”，开启“Action 调试模式”。
5. 打开 L15A 设备页，记录设备信息以及全部实体。

| 项目 | 实测值 |
| --- | --- |
| Home Assistant 版本 | 2026.9.3 |
| Xiaomi Home 版本 | v0.4.7 |
| 设备显示名称 | 待填写 |
| 实际 model | 待填写 |
| 地区 | 待填写 |
| 全部 entities | 待填写 |
| 全部 actions/services | 待填写 |
| Execute Text Directive | 待填写：有 / 无 |
| 对应 entity_id | 待填写 |
| Attributes 参数签名 | 待填写 |

判断标准：必须以 L15A 设备页实际生成的实体和 Attributes 为准，不能套用其他音箱型号的 `siid/aiid`。

### 官方物模型预检查

小米公开 MIoT-Spec-V2 中的 `xiaomi.wifispeaker.l15a` 已确认包含：

- Intelligent Speaker：`siid=7`
- Execute Text Directive：`aiid=4`
- 输入：Text Content `piid=1`、Silent Execution `piid=2`

这只能证明 L15A 产品物模型定义了该能力；P0 仍须以当前账号下真实设备生成的实体为最终结论。

## P1：创建五分钟后的原生提醒

若存在 `Execute Text Directive`：

1. 优先通过 Action 调试模式生成的 Text 实体发送 JSON 数组。
2. 如果 Attributes 显示参数为 `[Text Content(str), Silent Execution(bool)]`，输入：

   ```json
   ["五分钟后提醒我喝水", true]
   ```

3. 若 Text 实体不便操作，进入“开发者工具 → 操作”，选择该音箱的 Notify 实体；消息仍填写相同 JSON 数组。
4. 立即在小爱音箱或米家/小爱 App 中确认提醒是否已创建。不要只凭 HA 调用成功判断。

| 项目 | 实测值 |
| --- | --- |
| 指令原文 | 五分钟后提醒我喝水 |
| 静默参数 | true |
| 完整调用参数 | 待填写 |
| HA 返回/日志 | 待填写 |
| 音箱即时响应 | 待填写 |
| App/音箱中可见提醒 | 待填写：是 / 否 |

## P2：断开桥梁验证

仅在确认提醒已经创建后执行：

```bash
docker compose stop
```

随后退出 Codex；若要做最强验证，再关闭 Mac。到点后记录：

| 项目 | 实测值 |
| --- | --- |
| HA 已停止 | 待填写：是 / 否 |
| Mac 已关闭 | 待填写：是 / 否 |
| 到点音箱提醒 | 待填写：是 / 否 |
| 提醒实际文案 | 待填写 |
| 结论 | 待填写：通过 / 失败 |

只有停止 HA（最好同时关闭 Mac）后音箱仍按时提醒，才证明这是小爱原生提醒，而非本地定时播报。

## 故障分类

- 没有音箱设备：优先检查账号、家庭与云地区。
- 有设备但无 Execute Text Directive：记录完整 model 和实体；归类为设备物模型未提供或官方集成未暴露。
- 调用提示参数错误：严格复制实体 Attributes 的参数数量、顺序和类型。
- 调用成功但没有生成提醒：区分“仅 TTS/立即播报”和“小爱 NLU 执行失败”，不要进入 MCP 开发。
- HA 停止后不提醒：不满足目标，记录提醒到底由哪一侧保存，再决定是否进入第三方方案。
