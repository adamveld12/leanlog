---
description: |
    🚧 Build a Github Issue or task
    Invoke this skill whenever the user says:
    - "Build this"
    - "Implement this"
    - "I want to build...."
    - "code up this..."
argument-hint: "[Github Issue URL] [Task]"
---


# Work

Builds out a feature from a requirement doc + implementation plan.

Your task is to understand the implementation & requirements and then write code to implement it *completely and thoroughly*


## GOAL

1. Build out the feature completely following the implementation plan
2. Ensure you cover all cases


## Execution plan


1. *Determine user's request and ground yourself in context*

    First Read the user's input:
    ```
    $ARGUMENTS
    ```

- If this is a Github issue read the entire description + all comments for requirements and implementation notes and additional context.

- If this is an "adhoc" request, immediately run the `skill:leanlog-plan` with this request and then continue on with the next steps in this flow

2. Determine what code modules need to be modified and how best to implement
    - Use the `skill:tdd`
        - follow tdd principles, this skill will teach you how
        - Tests gate on **pre-push**, not pre-commit, so commit red freely — but pre-commit still runs `tsc`, so a test referencing a not-yet-created symbol won't commit until that symbol exists (stub it, or land test+impl together). See the tdd skill's "LeanLog: committing red tests".
    - Follow the **Backend & store conventions** and **Testing conventions** in `AGENTS.md` (D1 `d.batch` atomicity, snapshot-on-copy, optimistic-update mirroring, the `satisfies typeof api` mock, the design:audit recipe rules). Two #45 bugs came from skipping these.
    - Use the `skill:typescript-pro`
    - Use the `skill:react-best-practices`

3. Setup the local checkout
    - if there are unchanged files ask the user what they want you to do
    - fetch latest main
    - Open a worktree in `.worktrees` - name it. Name it appropriately for the feature
    - checkout a branch named appropriately for the feature. This is **REQUIRED**, so we have a clean place to work.

4. Build, check and iterate
    - Make logical commits as you go. Commit often
    - Use conventional commits message format
    - The pre-commit hook (tsc + eslint + `design:audit` + react-lint) runs on each commit; the pre-push hook runs `pnpm test`. No need to run these manually first — but expect the push to be blocked until the suite is green.

5. Open a PR
    - After opening, offer to watch it (`subscribe_pr_activity`) to autofix CI/review feedback.

