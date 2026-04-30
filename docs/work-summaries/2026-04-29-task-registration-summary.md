# 任务登记模块工作阶段总结

> 生成时间: 2026-04-29

---

## 一、问题修复记录

### 1.1 任务更新接口日期格式错误
- **问题**: `update_task` 端点直接将日期字符串（如 `'2026-04-08'`）传给 Prisma，而 Prisma 要求 ISO-8601 完整格式
- **根因**: `update_task` 仅做了字段重命名，缺少 `datetime.fromisoformat()` 转换，而 `create_task` 有该转换
- **修复**: 在 `apps/api/src/routers/tasks.py` 的 `update_task` 函数中添加了 `start_date` 和 `end_date` 的 `datetime.fromisoformat()` 转换

---

## 二、首次任务登记模块全面排查与建设

### 修复项总览

| # | 问题 | 修复内容 |
|---|------|---------|
| 1 | 新建任务时上传的需求文档，在查看和编辑页面无法查看/下载/替换 | 查看页面增加下载按钮和文件名展示；编辑页面增加 Upload.Dragger 支持删除和重新上传 |
| 2 | 同一个人可以重复分配到同一角色 | `handleAssignSubmit` 增加 `developer_id + role` 组合查重 |
| 3 | 分配弹窗只能分配一人后自动关闭，无法连续分配多人 | 移除 `onOk` 自动关闭，改为独立的"关闭"和"确认分配"按钮 |
| 4 | 分配按钮只在 DRAFT 状态显示 | 状态为 ASSIGNED 时也显示分配按钮 |
| 5 | 进度更新用数字输入，不够直观 | 将 `Input type="number"` 改为 `Slider` 组件，支持拖动选择 |

### Backend 同步修复
- `TaskCreate` / `TaskUpdate` Pydantic 模型增加 `requirement_doc` 字段
- `create_task` / `update_task` 函数正确映射 `requirementDoc` 字段

---

## 三、任务登记 UX 增强

### 修复项总览

| # | 问题 | 修复内容 |
|---|------|---------|
| 1 | 操作列的"查看"按钮与点击任务名称功能重复 | 从 `renderActionButtons` 移除 `key="view"` 按钮 |
| 2 | 进度滑块百分比仅滑动时显示，不便于二次确认 | 增加 `progressValue` 状态，始终显示百分比数值 |
| 3 | 分配弹窗中不显示已分配人员 | 增加"已分配人员" Tag 列表，显示开发者姓名和角色 |
| 4 | 已分配人员不支持删除 | 增加 `handleDeleteAssignment` + 删除列 + Backend `DELETE /tasks/{id}/assignments/{aid}` |
| 5 | 开发者列只显示最后一人 | 显示第一人姓名 + "+N人" 提示 |
| 6 | 延期申请弹窗未显示任务名称 | 增加琥珀色任务名称卡片 |
| 7 | 延期申请逻辑没有闭环 | 实现完整闭环：提交 → 延期记录 Tab 查看 → 审批/拒绝 → 通过后更新任务 endDate |

### Backend 新增端点
- `DELETE /{task_id}/assignments/{assignment_id}` — 删除分配
- `GET /{task_id}/delays` — 查询延期申请列表
- `PUT /{task_id}/delays/{delay_id}` — 审批（更新任务 endDate）或拒绝

---

## 四、操作按钮优化

### 修复项总览

| # | 问题 | 修复内容 |
|---|------|---------|
| 1 | 操作按钮位置不固定，时有时无 | 按钮始终显示，按任务阶段决定可用/禁用状态 |
| 2 | 按钮顺序按状态变化而变化 | 按任务阶段顺序固定排列：分配 → 进度 → 延期 |
| 3 | 禁用状态按钮应置灰不可点击 | 根据任务状态判断各按钮的 disabled 状态 |

---

## 五、细节问题修复（最新）

| # | 问题 | 修复内容 |
|---|------|---------|
| 1 | 删除分配后开发者列数据未同步 | `handleDeleteAssignment` 执行后调用 `fetchTasks` 刷新列表 |
| 2 | 延期申请检测逻辑错误，影响了所有任务 | 使用 `currentTaskIdRef` 追踪当前任务ID，确保检测仅针对当前任务 |
| 3 | 操作按钮过多不美观 | 仅显示当前阶段可操作按钮，按固定顺序排列，不可操作时置灰 |

---

## 六、文件变更清单

### Backend
- `apps/api/src/routers/tasks.py` — 日期转换、requirement_doc 字段、删除分配端点、延期申请端点

### Frontend
- `apps/web/src/pages/tasks/TaskRegistration.tsx` — 所有前端修复和增强

---

## 八、任务详情页重新设计（2026-04-29 下午）

### 设计问题与修复
- **原问题**：Ant Design `Descriptions` 组件中 `span={2}` 的全宽字段（任务名称、描述、需求文档）会与同行字段共享行高，内容过长时把整行撑高，右侧大片空白未利用
- **修复**：用 CSS Grid 替代 `Descriptions`
  - `gridTemplateColumns: '120px 1fr 120px 1fr'` 用于 2 列布局（4 列 grid）
  - `gridTemplateColumns: '120px 1fr'` 用于全宽布局（2 列 grid）
  - 全宽字段（任务名称/描述/交付标准/需求文档）独占一行，内容纵向延展不会影响同行的其他字段

### 布局结构
| 字段 | 布局 |
|------|------|
| 任务名称 | 全宽独占一行 |
| 合作伙伴 + 开发者 | 2列 |
| 任务类型 + 优先级 | 2列 |
| 开始日期 + 结束日期 | 2列 |
| 预算 + 当前进度 | 2列 |
| 任务描述 | 全宽独占一行 |
| 交付标准 | 全宽独占一行 |
| 需求文档 | 全宽独占一行 |
| 任务流程条 | 独立区块 |

### 长文本保护
- `word-break: break-word` — 防止字符溢出
- `text-wrap: pretty` — 自动换行优化排版
- `alignItems: 'flex-start'` — 全宽字段内容顶对齐

### 文件
- 设计稿：`docs/work-summaries/task-detail-redesign.html`
- 实现：`apps/web/src/pages/tasks/TaskRegistration.tsx`（Drawer 组件）
