#!/usr/bin/env node
/**
 * Full classification report for every FOUNDER-REVIEW tag (JSON lines to stdout).
 */

import { branchOnlyTagKeys, gitIntroDate, scanAllTags, tagsOnMainOnlySet } from "./founder-review-lib.mjs";

const hits = scanAllTags();
const onMain = tagsOnMainOnlySet();
const branchOnly = branchOnlyTagKeys(hits);

for (const hit of hits) {
  const key = `${hit.file}:${hit.line}`;
  const onMainBranch = onMain.size === 0 ? true : onMain.has(key);
  const extraBranch = branchOnly.find((b) => b.key === key)?.branch ?? null;
  console.log(
    JSON.stringify({
      file: hit.file,
      line: hit.line,
      display: hit.display,
      visibility: hit.visibility,
      onMain: onMainBranch,
      onlyOnBranch: extraBranch,
      introduced: gitIntroDate(hit.file, hit.line),
    }),
  );
}

const userVisible = hits.filter((h) => h.visibility === "user-visible").length;
console.error(
  JSON.stringify({
    totalTags: hits.length,
    userVisibleTags: userVisible,
    internalTags: hits.length - userVisible,
    tagsOnMain: hits.filter((h) => onMain.has(`${h.file}:${h.line}`)).length,
  }),
);
