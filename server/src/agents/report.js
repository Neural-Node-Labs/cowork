'use strict';
const fs = require('fs');
const path = require('path');

function generateReport({ workspace, plan, llmSummary }) {
  const subTasks = plan['sub-tasks'];
  const counts = subTasks.reduce(
    (acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    },
    {}
  );

  const lines = [];
  lines.push(`# Task Report`);
  lines.push('');
  lines.push(`**Task:** ${plan.task}`);
  lines.push(`**Workspace:** ${plan['target-workspace']}`);
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push('');
  lines.push(
    `**Summary:** ${counts.done || 0} done, ${counts.failed || 0} failed, ${counts.blocked || 0} blocked, ` +
      `${subTasks.length} total.`
  );
  lines.push('');
  lines.push(`## Sub-tasks`);
  lines.push('');
  for (const t of subTasks) {
    const icon = t.status === 'done' ? '✅' : t.status === 'failed' ? '❌' : t.status === 'blocked' ? '⛔' : '⏳';
    lines.push(`### ${icon} [${t['task-id']}] ${t.task}`);
    lines.push(`- **Status:** ${t.status}`);
    lines.push(`- **Command/instruction:** ${t.command}`);
    lines.push(`- **Validation criteria:** ${t.validation}`);
    if (t['depend-on']?.length) lines.push(`- **Depends on:** ${t['depend-on'].join(', ')}`);
    if (t.result) {
      lines.push(`- **Summary:** ${t.result.summary}`);
      if (t.result.validation_result) lines.push(`- **Validation result:** ${t.result.validation_result}`);
    }
    lines.push('');
  }

  if (llmSummary) {
    lines.push(`## Overall notes`);
    lines.push('');
    lines.push(llmSummary);
    lines.push('');
  }

  const content = lines.join('\n');
  const reportPath = path.join(workspace, '.agent', 'report.md');
  fs.writeFileSync(reportPath, content, 'utf8');
  return { content, reportPath, counts };
}

module.exports = { generateReport };
