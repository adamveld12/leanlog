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
        - write failing tests first, and commit these. THEN write working code that makes them pass and commit the green tests.
    - Use the `skill:typescript-pro`
    - Use the `skill:react-best-practices`

3. Setup the local checkout
    - if there are unchanged files ask the user what they want you to do
    - fetch latest main
    - checkout a branch named appropriately for the feature. This is **REQUIRED**, so we have a clean place to work.

4. Build, check and iterate
    - Make logical commits as you go. Commit often
    - Use conventional commits message format
    - commit hooks will run on each commit, so running these before committing is not necessary

5. Open a PR

