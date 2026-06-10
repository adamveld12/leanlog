---
description: Initiate a code review from Claude on a PR.
---


# TASK:

Initiate a code review from Claude by leaving a comment on the Github PR for claude to review the code.

- Tag claude `@claude` in the comment.
- Add a prompt message to highlight where you would like Claude to focus.



## Example

```bash

 $ gh pr comment 18 --body \
    "@claude Please review the latest changes on this PR,
with special attention to the direct deep-link routing fix.
Focus on whether route-specific day loading avoids premature
redirects, preserves signed-out behavior, handles missing days
correctly, and doesn't introduce React hook/state or design-system
issues. Also check the new integration tests for meaningful
coverage and any edge cases around initial list hydration racing
with direct route loading."

```
