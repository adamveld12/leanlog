---
description: |
    🗺️ Develop a detailed multi step action plan.
    Use this skill whenever a user says things like:
    - "plan this feature...."
    - "I want to work on...."
    - "lets work on <github issue URL>"
argument-hint: "[Github issue URL] [task]"
---


## TASK:

Your task is to formulate an in depth and detailed implementation plan that will later be followed closely to build a feature.

You are *NOT* to write any code. You will output the plan to the Github Issue as a comment.

Below is the work we want to create an implementation plan for:

```
$ARGUMENTS
```


## WORKFLOW:

1. Analyze the request carefully and completely - explore the codebase and use documentation eagerly.
    - Search the code base thoroughly. Use tools like grep and ls liberally.
    - Look for ambiguity, gaps and unclear requirements.
    - Perform as many rounds of Q&A as necessary to fill in all gaps you found.


2. Present a list of BDD (Behavior Driven Design) specifications in Gherkin Syntax that will form the basis of the specification for this implementation.
    - Use the `skill:bdd-gherkin-specification` skill to write these. Keep them short and quickly scanable. If the feature needs more than 5-9 specs then it's likely too large and complex and recommend reducing the size.

3. Produce an implementation plan with the following sections for my review:

- **Executive Summary**: A high level, terse, and highly information dense 2-4 sentence summary of the plan, why this is the best option and any trade-offs that are being made.

- **The step by step execution plan**: A summary of the overall plan and the list of all code changes in a logical execution plan.
    - Give a brief and tight summary of the overall plan. Include visual aids.
        - If you are building UI, always include ASCII UI wireframes. A desktop + a mobile version.
        - For complex logic, use ASCII sequence diagrams.
    - Write out the behavior driven design "specs" for all of the code changes, and what you believe you are building. This must be presented as a list of specs written in gherkin spec format.
    - List each step. Each step should be formatted such that:
        1. explains the step in 1-2 sentences clearly
        2. list the code files affected
        3. include code snippets if applicable for the most critical and complex code paths
        4. Note unit test scenarios that would be valuable.

- **Infrastructure & Ops**: Note any environment variables, database changes, etc that are required for this implementation.
    - ENV VARS: state then ENV VAR name, what service to get it from (Clerk, Cloudflare, Posthog etc) and what component or system needs this env var in the code. Also note if this is needed for build time, run time or both.

- **The impact report**: Note the downstream impacts, tech debt and future work we are deferring now.
    - Tech debt: explicitly call out short cuts, trade offs and other issues with this implement.
    - Out of Scope: note what is out of scope or otherwise purposefully not considered in this plan.

- **Q&A**: A list of questions you have for me to add more specificity and clarity to the implementation.
    - Identify ambiguity in the plan request and interview me to fill those gaps.
    - Review the plan for gaps and question


5. Iterate on the plan with me until I approve.
    - Until I say "I approve", you are to be in an "iteration" mode.

6. Approval
    - when the plan is approved, write it back to the Github issue as a comment labelled IMPLEMENTATION PLAN
    - you are officially out of plan mode

Construct this plan for me, follow my output format closely. Present it to me for my approval.

