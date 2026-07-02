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

Prefer one compare directory that contains one successful run and one failed run:

```
<compare-dir>/
  ├── success/
  │   ├── success.json | <N>.execution.json
  │   └── screenshots/
  └── fail/ | failure/
      ├── fail.json | failure.json | <N>.execution.json
      └── screenshots/
```

Also accept two explicit split-report directories. Each should contain:

```
<report-dir>/
  ├── <N>.execution.json | success.json | fail.json | failure.json
  └── screenshots/
```

The user may provide either:

1. `compareDir` — a directory containing success/fail subdirectories
2. `successDir` and `failureDir` — explicit successful and failed report directories
3. Two report JSON files — infer each report directory from the JSON file parent

If the user only gives a parent compare directory, recursively search up to a small depth for directories that contain one report JSON file and a sibling `screenshots/` directory. Infer success/failure labels from directory or file names (`success`, `pass`, `ok`, `成功`; `fail`, `failure`, `failed`, `error`, `失败`). If labels are ambiguous, summarize the candidates and ask the user which is success/failure.

If the user only gives report paths, infer the split directory by looking for the parent directory containing the report JSON and `screenshots/`, or for a sibling `split/` folder.

## Workflow

### 1. Locate and validate inputs

- Resolve input shape: `compareDir`, explicit directories, or explicit JSON files
- Find exactly one success report and one failure report when possible
- In each report directory, find the report JSON in this priority:
  1. `*.execution.json`
  2. `success.json`, `fail.json`, `failure.json`
  3. any single `*.json` that has Midscene report keys such as `executions`, `tasks`, `sdkVersion`
- Verify `screenshots/` subdir exists next to each report JSON
- Verify every referenced screenshot path in `uiContext.screenshot` and `recorder[].screenshot` exists under that report directory. If references are missing, search sibling report directories and flag possible swapped/misaligned JSON and screenshot folders before analyzing visual evidence.
- Do not trust folder names alone. Treat `success/` and `fail/` as labels, but verify them against task outcome, error/running status, and screenshot-reference consistency.
- Note the file paths for later

### 2. Read and summarize each report

For each report JSON, support both split execution JSON and full report dump JSON. If the top-level has `executions`, select the relevant execution, usually `executions[0]` unless multiple executions are present and the user named one.

Extract:

- Execution `name` and `id`
- Number of `Planning/Plan` tasks (planning loops)
- Total tasks, failed tasks, cancelled tasks
- Ordered task sequence: `type`, `subType`, `status`, `param`, `thought`, selected `response`, selected `result`
- List of `Action Space` tasks with `subType` and key params (`uri`, `value`, `locate.description`, bbox/center)
- `hitBy.from` values (`Plan`, `Cache`, etc.)
- Any `errorMessage` fields
- Key screenshots (`uiContext.screenshot`) for each Planning and Action Space task

When comparing `Locate` and input/tap tasks, always extract both logical bbox (`param.bbox`) and pixel bbox/center (`param.locatedPixelBbox`, `param.locate.center`) because visual coordinate mismatch is a common root cause.

When a report JSON references screenshots that are not present next to the JSON, include a "Data Integrity" note in the output. Visual conclusions should be marked lower-confidence until the screenshot directory alignment is fixed.

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
