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

When a report JSON references screenshots that are not present next to the
JSON, record that in the bottom **Data And Key Metrics** section. Visual
conclusions should be marked lower-confidence until the screenshot directory
alignment is fixed.

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

### 5. Generate the static HTML report

The final deliverable should be a self-contained static HTML report saved inside the compare directory, for example:

```
<compare-dir>/report-compare.html
```

If the user provided explicit report directories instead of a shared compare directory, save the HTML to the nearest common parent directory, or to the current working directory as `midscene-report-compare.html`.

The HTML report must be usable by opening it directly in a browser. Do not require a dev server. Use relative paths to screenshots whenever possible so the report remains portable with the compare directory. Do not inline large base64 screenshots unless the user explicitly asks for a single-file artifact.

The report must be concise and root-cause first. Use this structure in this
exact order:

1. **Executive Summary**
   - Put the root-cause diagnosis first, visually emphasized in a highlighted
     block.
   - Keep the root-cause diagnosis within 50 Chinese characters. Put supporting
     details in secondary bullets after the highlighted block.
   - State the concrete failed behavior and why it happened, not just the final
     failed assertion.
   - Put secondary context after the root cause: labels such as planning drift,
     replanning limit, missing screenshots, confidence level, and the fact that
     the data was converted from HTML.
2. **First Divergence**
   - Start with the original step content/instruction being compared.
   - Focus only on the first semantically meaningful divergence and what each
     side did after that point.
   - Use a compact table with rows like:
     - `Divergence point`: success target/action vs failure target/action
     - `After divergence`: how the success path progressed vs how the failure
       path drifted
     - `Final result`: success completion vs failure/error
   - Include only compact evidence snippets that directly support this first
     divergence, such as short action sequences and exact error/replanning
     messages. Do not create a separate evidence appendix.
   - Remove setup/background rows such as app install, page load, or earlier
     matching checks unless they are the divergence.
3. **Data And Key Metrics**
   - Put this section at the end of the page, not near the top.
   - Merge data integrity and metrics into one table.
   - Include only important fields: source HTML/JSON paths, conversion
     directories, parsed dump count, execution count, total tasks, planning
     tasks, action tasks, failed tasks, dominant action types, and missing
     screenshots.
   - Use this as supporting evidence, not as the lead narrative.

Do not include these sections in the default report:

- `Execution Alignment Table`
- `Conclusion Cards`
- `Raw Evidence Appendix`
- `Evidence Timeline` / `Key Evidence Timeline`

If alignment information is useful, fold the single divergent execution into
the **First Divergence** section instead of adding a full alignment table.

Recommended HTML layout:

- A sticky top summary bar with verdict and confidence
- A highlighted root-cause block in the executive summary, limited to 50 Chinese
  characters
- Screenshot thumbnails that can be clicked/opened at full size
- Badges for task status, `hitBy.from`, action type, and risk category
- A highlighted "First divergence" section immediately after the executive
  summary
- The merged data/key-metrics table at the bottom of the page

The assistant's chat response should briefly summarize the result and point to the generated HTML path.

Also include a concise markdown summary in the chat:

```markdown
## Summary

Root cause: ... (50 Chinese characters max)

## First Divergence Point

- Original step: ...
- Divergence point: ...
- Success after divergence: ...
- Failure after divergence: ...

## Data Notes

- Converted output: ...
- Screenshot completeness: ...

## HTML Report

- Generated: `<compare-dir>/report-compare.html`
```

## Checklist

- [ ] Confirmed both split-report directories and `*.execution.json` exist
- [ ] Verified `screenshots/` directories are present
- [ ] Verified screenshot references resolve to existing files
- [ ] Extracted planning loops, action sequences, and errors from both reports
- [ ] Identified the first meaningful divergence between success and failure
- [ ] Generated a static HTML report in the required root-cause-first structure
- [ ] Kept the root-cause diagnosis within 50 Chinese characters
- [ ] Folded compact evidence snippets into First Divergence when useful
- [ ] Moved the merged data/key-metrics table to the end of the report
- [ ] Avoided Execution Alignment Table, Conclusion Cards, Raw Evidence Appendix,
      and Evidence Timeline
- [ ] Gave a concrete root-cause diagnosis and recommendation

## Tips

- If reports are large, focus on the first divergence rather than summarizing every task.
- Cache hits (`hitBy.from: "Cache"`) in the failure case are a common source of planning drift.
- Multiple `Planning/Plan` tasks for the same `userInstruction` indicate replanning loops.
- When comparing locate tasks, look at `bbox`/`center` and the `description` field, not just the action type.
- If the failure report has screenshots that clearly differ from the success report at the same step, highlight them as primary evidence.
