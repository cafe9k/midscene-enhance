---
name: midscene-report-compare
description: "Use when the user wants to compare two Midscene split reports for the same operation to identify planning drift or execution differences. Examples: \"对比这两份 Midscene 报告\", \"分析为什么这次失败了\", \"定位 planning drift\", \"同样操作成功和失败有什么不同\""
---

# Midscene Report Comparison

Compare a successful and a failed Midscene split report to identify planning drift, action divergence, and root causes.

## When to Use

- "对比这两份 Midscene 报告"
- "分析这次失败是不是 planning drift"
- "为什么同样操作这次失败了"
- "定位 AI 规划漂移"
- "成功和失败的 execution.json 有什么区别"

## Required Input

Two split-report directories. Each must contain:

```
<report-dir>/
  ├── <N>.execution.json
  └── screenshots/
```

The user should provide:

1. `successDir` — path to the successful run's split report directory
2. `failureDir` — path to the failed run's split report directory

If the user only gives report paths, infer the split directory by looking for the sibling `split/` folder or the directory containing `*.execution.json` and `screenshots/`.

## Workflow

### 1. Locate and validate inputs

- Verify both directories exist
- Find `*.execution.json` in each
- Verify `screenshots/` subdir exists
- Note the file paths for later

### 2. Read and summarize each report

For each `execution.json`, extract:

- Execution `name` and `id`
- Number of `Planning/Plan` tasks (planning loops)
- Total tasks, failed tasks, cancelled tasks
- List of `Action Space` tasks with `subType`
- `hitBy.from` values (`Plan`, `Cache`, etc.)
- Any `errorMessage` fields
- Key screenshots (`uiContext.screenshot`) for each Planning and Action Space task

### 3. Build the comparison prompt

Construct a structured prompt containing:

- The two execution summaries side by side
- Key screenshots from critical steps (planning outputs, first divergence, failure point)
- The question: "Why did the failed run diverge from the successful run?"

Keep the prompt focused on the first point of divergence and the planning chain that led to it.

### 4. Analyze with the model

Use the model to answer:

1. At which planning step did the two runs diverge?
2. What was the planned action/thought in the success case vs the failure case?
3. Was the drift caused by:
   - Replanning loop accumulation?
   - Wrong locate/bbox?
   - Cache hit with stale context?
   - Sub-goal modification?
   - Screenshot/context misinterpretation?
4. What is the root cause and suggested fix?

### 5. Output the result

Format the answer as:

```markdown
## Summary

| Metric | Success | Failure | Note |
|---|---|---|---|
| Planning loops | N | M | ... |
| Total tasks | N | M | ... |
| Failed tasks | 0 | N | ... |
| Cache hits | N | M | ... |

## First Divergence Point

- Step: ...
- Success thought/action: ...
- Failure thought/action: ...

## Root Cause

...

## Recommended Fix

...

## Screenshot Evidence

- success: `screenshots/xxx.png` — ...
- failure: `screenshots/yyy.png` — ...
```

## Checklist

- [ ] Confirmed both split-report directories and `*.execution.json` exist
- [ ] Verified `screenshots/` directories are present
- [ ] Extracted planning loops, action sequences, and errors from both reports
- [ ] Identified the first meaningful divergence between success and failure
- [ ] Included relevant screenshots in the analysis
- [ ] Gave a concrete root-cause diagnosis and recommendation

## Tips

- If reports are large, focus on the first divergence rather than summarizing every task.
- Cache hits (`hitBy.from: "Cache"`) in the failure case are a common source of planning drift.
- Multiple `Planning/Plan` tasks for the same `userInstruction` indicate replanning loops.
- When comparing locate tasks, look at `bbox`/`center` and the `description` field, not just the action type.
- If the failure report has screenshots that clearly differ from the success report at the same step, highlight them as primary evidence.
