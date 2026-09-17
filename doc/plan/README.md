# Development milestones

- updated_at: 2026-09-17
- author: Codex
- status: phase-3-summary-complete; later-stages-unverified

## 当前执行计划（2026-09-17）

阶段 3：账号失败、worker 失败或缺失结果会选取失败退出码，103 项测试通过。下一步修正汇总信息；真实进程与 IPC 验证仍未完成。见[阶段记录](../operation-log/2026-09-17-phase-3-exit-status.md)。

最新进展：主面板和备用面板均已校验余额，错误能传到 getCurrentPoints 调用方，95 项测试和构建通过。下一步核查账号及 worker 失败如何影响进程退出状态；来源和观察时间仍待补充。[阶段 2 最新记录](../operation-log/2026-09-17-phase-2-primary.md)。下方阶段 1 范围为历史记录。

当前推进离线技术验证，不运行真实账号，也不新增自动赚分工作流。以下里程碑记录需求方向，不等于全部已实现或批准运行。第一阶段不修改原有登录、搜索和领取执行器。

### 阶段 1：可复现的离线验证基线

- DONE：读取现有脚本；运行上游日志解析测试，9/9 通过。
- DONE：使用锁文件安装依赖，禁用依赖安装脚本，不安装浏览器。
- DONE：执行构建并如实记录结果，构建失败不掩盖为成功。
- DONE：先写独立 CLI 的失败测试，再实现只接受合成 JSON 样本的检查器。
- DONE：新增默认离线配置；任何尝试开启网络、登录或奖励动作的配置在读取样本前拒绝。当前检查器不实现这些能力，也不导入应用入口。
- DONE：用 CN/HK 合成样本、零值、缺失／非法余额、面板变化、错误配置和超大输入验证诊断结果。
- DONE：测试、格式和代码检查后审查差异；记录结果及计划再评估，提交到开发分支。

验收：离线命令可重复运行；未知不能报告为零；样本检查通过不标为真实市场可用或积分到账；全部新测试通过，构建状态单独报告。

文件范围：新增 `config/validation.example.json`、`scripts/validation/inspect-fixture.mjs`、`scripts/validation/inspect-fixture.test.mjs`、`tests/fixtures/validation/*.json`；在 `package.json` 增加独立验证命令；不更改生产入口。源代码处置清单见 [代码处置](modules/single-account-cloud/code-disposition.md)。

### 阶段 2 候选：只读解析契约验证

阶段 1 复评后再确认：用合成或合法脱敏样本验证上游真实解析器，检查缺失字段、页面版本变化和数据完整性；不接入登录、任务和领取。若构建存在阻塞，先明确属于环境、编译配置还是源代码问题。不得把离线检查器的成功外推成生产功能成功。

### 每阶段复评记录要求

在 `doc/operation-log/` 记录基线提交、命令、运行环境、通过／失败数、未覆盖内容、保留／调整／暂停的下一步。没有实际执行的检查标为未执行；外部运行环境和账号验证与离线验证分开。

Owner: Codex for code changes and offline verification; account owner for any authentication that requires personal interaction.

1. **Reliable results:** account failures reach the process exit status; missing balances remain unknown; valid zero activity is not treated as an error.
2. **Single-account execution boundary:** cloud execution rejects configurations containing zero or multiple accounts before opening a browser or submitting any activity. The ordinary upstream local interface need not be removed.
3. **Bounded recovery:** preserve supported automatic authentication methods, limit recovery by attempts and elapsed time, and persist interruption state.
4. **Change detection and notification:** distinguish authentication problems, incompatible page/data structures, and unconfirmed results; stop affected work, deduplicate alerts, and validate recovery before resuming.
5. **Runtime integration:** validate confidential session persistence, account-level mutual exclusion, runtime budgets, and the suitability of the selected host. Repository hosting, CI, and the runtime are separate decisions; do not assume GitHub Actions usage eligibility from available free minutes.
6. **Separate regional acceptance:** evaluate CN and HK independently against real supported account environments. No regional success is inferred from a locale setting or from the other region's result.

See [requirements](modules/single-account-cloud/requirements.md) for acceptance criteria. Each implementation change should have a focused regression test and a recorded result before advancing to runtime or live-account verification.

## Upstream maintenance

- Retain upstream commit history and the `upstream` remote.
- Review upstream changes on a separate update branch before integrating them.
- Prefer focused patches and narrow interfaces over widespread file moves.
- Do not automatically deploy an unreviewed upstream update.
- Keep an identifiable previously verified revision for rollback.

## Phase 1 reassessment

Build and 40 tests passed. Two characterization tests reproduce upstream balance defects, which remain open. See the [phase report](../operation-log/2026-09-17-phase-1.md). Next priority: actual parser contracts and caller handling of unknown balances; live compatibility remains untested.

Current update: explicit run summaries and nullable aggregate totals are implemented; 106 tests and build pass. Next: account-result contracts and failure classification. See [summary evidence](../operation-log/2026-09-17-phase-3-summary.md).
