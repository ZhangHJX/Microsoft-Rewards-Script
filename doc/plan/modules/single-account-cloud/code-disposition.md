# 阶段 1 代码处置清单

- updated_at: 2026-09-17
- author: Codex / alternative
- status: reviewed; phase-1-complete

## 当前范围

本清单根据上游基线 `d0f07d74a0ed4dda127855d6e3dde98bf4c89d6e` 的静态审查制定，服务于 [需求记录](requirements.md)。需求记录描述长期目标；本阶段仅建立现有测试基线和独立离线样本校验。下列“重构”属于已识别的后续边界，不表示本阶段获得实施授权或已经修复。

本阶段不运行或增强真实认证、搜索、任务、领取或其他 Rewards 请求，不创建定时运行工作流，不接入真实凭据、浏览器登录态或云端状态存储。离线结果只证明样本和本地契约的行为，不证明现网可登录、地区兼容或积分到账。CN、HK 是待分别验证的目标，不能通过样本命名或 locale 配置宣称适配成功。

## 保留

| 路径 | 理由 | 阶段 1 验收 |
|---|---|---|
| `scripts/api/logParser.js`、`scripts/api/logParser.test.js` | 已有独立日志解析测试，可记录原始基线；日志显示能力仍有用 | 保留原有语义，记录实际测试命令、结果和环境；失败如实记录，不为通过而放宽断言 |
| `src/util/Locale.ts` | 输入输出较集中，地区/语言规范化可复用 | 不改地区含义；文档明确配置地区不等于实际市场资格 |
| `src/functions/activities/search/SearchProgress.ts` | 配额计算已集中，可作为后续纯计算提取候选 | 保留业务实现，不运行搜索；离线样本中的已满额度与缺失额度分开表达 |
| `src/browser/FlyoutDashboard.ts` | 已有备用面板映射和数据不足处理，值得保留为适配器基础 | 保留原代码；独立样本验证展示完整数据与部分数据的区别，不声称现有映射已修复 |
| `src/util/SessionStore.ts` | SQLite 已按邮箱和平台隔离，读写使用参数化 SQL | 不读取真实会话数据库；仅记录后续隔离与持久化需求 |
| `LICENSE`、上游历史及现有依赖锁文件 | 保持来源和许可可追溯，便于核对上游更新 | 不改许可证，不因私有化删除来源；无任务需要时不调整依赖 |

## 重构候选：本阶段只记录，不接通实际执行

| 路径/边界 | 静态证据与理由 | 后续验收方向；本阶段不实施 |
|---|---|---|
| `src/index.ts` 的 `runTasks`、worker/master 汇总、CLI 退出 | 账号失败记录后，单进程仍可 `process.exit(0)`；worker 也可在收到失败 stats 后正常退出 | 执行结果与 CLI 退出分离；失败可聚合，正常无任务不是错误；不能靠日志颜色判断成功 |
| `src/index.ts` 的账号运行上下文、`src/browser/BrowserFunc.ts` | Bot 被串行账号复用；`useFlyoutDashboardFallback` 置 true 后没有按账号复位；`userData.gainedPoints` 没有每账号清零 | 账号上下文完整隔离；失败/降级模式不遗留。当前只描述问题，不扩展多账号执行 |
| `src/browser/BrowserFunc.ts`、`src/browser/FlyoutDashboard.ts` 的余额读取 | 缺失或不可转换的余额可能被 fallback 成 0；最终结果也可能将 NaN 转成 0 | 有效零与 unknown 区分；读数附来源、时间与完整性；本阶段用独立样本表达该契约 |
| `src/functions/Activities.ts`、`src/functions/activities/BaseActivity.ts` | 任务依赖整个 Bot，多个方法返回 `Promise<void>`，无法汇总明确结果 | 后续缩小依赖并设计结构化结果；本阶段不改变任务执行、领取或搜索能力 |
| `src/functions/activities/api/ClaimReward.ts`、`ClaimBonusPoints.ts` | 异常仅写日志；acknowledged 且零增长也可能记录完成 | 确认响应、观察到余额变化和任务到账证据分开；仅离线校验这些概念，不实现领取逻辑 |
| `src/util/Http.ts`、`src/browser/BrowserFunc.ts` 的 transport | 通用重试不按读写区分，修改型请求可能沿用默认重试 | 后续审查副作用与结果未知状态；本阶段不新增请求、重试或传输实现 |
| `src/browser/auth/Login.ts` 及 `methods/` | 认证分支较多且与 Bot/页面耦合；后台邮件码明确依赖交互 | 后续验证成功、失败和人工处理的表达；保留上游处理，不修改或执行认证流程 |

以上静态发现不等于已发生账户泄漏、重复积分或地区故障；相关实际影响未做账号实测。后续若调整这些实现，应另开明确范围、回归验收和审查记录。

## 新增：仅限离线基线与样本校验

下表保留设计验收方向；实际新增文件和已覆盖范围见阶段记录，未覆盖的业务契约仍属后续工作。

| 建议路径 | 目的 | 必须满足的验收 |
|---|---|---|
| `scripts/validation/` | 放置独立的样本读取、结果校验及测试入口 | 不导入 `src/index.ts`，不启动其顶层 main；不导入或调用认证、浏览器、任务、领取、HTTP 客户端 |
| `tests/fixtures/validation/` | 使用合成、脱敏且静态的余额/结果样本 | 不含密码、邮箱身份、token、cookies、真实会话；不需要网络更新；不以“CN/HK 样本”冒充地区实测 |
| `scripts/validation/*.test.*` | 校验未知、有效零、部分数据、确认但未验证等样本语义 | 明确覆盖缺失、null、非数值、有效零；不从 ack=true 推导到账；执行前检查导入链无外部副作用 |
| `doc/operation-log/` 中的阶段记录 | 记录基线和新增校验的实际结果及限制 | 给出代码修订、环境、执行命令、通过/失败数量与未执行事项；不得把未运行写成通过 |

新校验必须与生产逻辑保持明确边界：通过独立样本测试不代表 `BrowserFunc`、`ClaimReward` 或主执行流程已经满足相同契约。不要用与待测实现完全重复的预期计算制造“通过”；用具有明确预期含义的固定样本验证边界。

现有 `test:log-parser` 是基线的一部分；不得运行 `start`、`ts-start`、`dev`、`manual-login` 或任何真实任务入口来验证阶段 1。新增脚本是否完全离线以导入链和实际调用为准，不只看脚本名称。

## 暂不删除

| 路径 | 暂留原因 | 本阶段限制 |
|---|---|---|
| `src/browser/auth/`、`scripts/main/manualLogin.js` | 保留上游认证兼容性，删除并不能完成可靠性验证 | 不调用、不修改认证处理 |
| `src/functions/activities/`（含 experimental） | 避免把审查阶段变成无回归的大规模裁剪，便于与上游比较 | 不执行或增强任何活动；存在不表示未来全部启用 |
| `src/index.ts` 的 cluster 分支 | 单账号目标不要求立即删除上游本地接口 | 不开启并发；离线校验不导入入口 |
| `scripts/api/`、日志通知模块 | 现有解析测试依赖部分代码，后续是否保留完整控制面另评估 | 不启动 API 服务或发送真实通知 |
| `.github/workflows/auto-release.yml`、`format-check.yml`、`format-main.yml` | 当前上游工作流用途是发布/格式处理，不是定时 Rewards 运行 | 不在本阶段创建、启用或触发云端运行/发布；保留文件不表示已批准执行 |
| `Dockerfile`、`scripts/docker/`、`src/crontab.template` | 运行环境尚未进入本阶段，删除无助于离线基线 | 不构建启动任务容器，不配置或安装定时任务 |

## 原定阶段完成标准（实际覆盖见下方阶段记录）

- TODO：记录原有离线日志测试的真实结果。
- TODO：增加独立合成样本校验，并确认导入和调用链不产生网络、浏览器、认证、领取或通知副作用。
- TODO：验证有效零、缺失值、部分数据、确认但到账未知能被区分；不把样本通过写成生产修复。
- TODO：由主负责人汇总改动、测试证据及后续范围，统一评估和提交。本清单的编写不产生部署授权。
- WONTDO：阶段 1 不实施真实认证、任务、领取、云端调度、会话上传、地区实测或自动赚分执行器升级。

## Implementation reconciliation

Phase 1 is complete; the proposed checklist above is superseded by the [executed phase report](../../../operation-log/2026-09-17-phase-1.md). Added files are under scripts/validation, tests/fixtures/validation and config. Partial business-data and acknowledgement contracts remain untested; production implementations were not changed.
