## Workflow

- Always make regular git commits at logical points
- Each git commit should be a working, running state of the repo
- _ONLY_ make commits using conventional commit style.

## Design System Enforcement

The pre-commit hook runs `pnpm -r lint` + `pnpm design:audit` and blocks commits that violate design system rules. If your commit is blocked:

1. Read the error messages — they tell you which atom to use instead of the raw element
2. Fix the violations (do NOT bypass with `--no-verify`)
3. If you need a legitimate exemption, use `// eslint-disable-next-line no-restricted-syntax` with a justification comment

Every UI component must have a Storybook story. The audit enforces this.

### Raw HTML elements are banned

**Never use raw HTML `<button>`, `<input>`, `<select>`, `<textarea>`, or `<label>` elements.** ESLint will block your commit if you do. Always use the corresponding atoms from `@leanlog/ui`:

| Raw element                | Use instead                                                             |
| -------------------------- | ----------------------------------------------------------------------- |
| `<button>`                 | `<Button>`                                                              |
| `<input>`                  | `<Input>`, `<NumberInput>`, `<IntegerInput>`, or `<FileInput>`          |
| `<select>`                 | `<Select>`                                                              |
| `<label>`                  | `<Label>`                                                               |
| `<textarea>`               | Design system atom (none yet — create one if needed)                    |
| `<h1>`–`<h4>`              | `<PageTitle>`, `<SectionHeading>`, or `<Text>` with appropriate variant |
| `<p>`, `<span>`, `<small>` | `<Text>`, `<HelperText>`, `<WarningText>`, `<UnitText>`                 |
| `<a>`                      | `<Button>` with `as="a"` or React Router `Link`                         |

This applies everywhere — `apps/web/`, `packages/ui/` (outside atoms), and any new packages. The only place raw elements are allowed is inside atom component implementations in `packages/ui/src/atoms/`.

## SKILLS LOADING HINTS

You **MUST PROACTIVELY** load these skills in these following scenarios. Also respect the skill hints in the skill.md themselves.

- **BEFORE** you edit or read any `.tsx/jsx` file, frontend page, react components or in the `@packages/ui` module

```
skill:react-best-practices
skill:typescript-pro
skill:leanlog-design-system

@docs/design-reference.md
@docs/design-system.md
```

- When I ask you to plan implementation, load these immediately

```
skill:tdd
skill:react-best-practices
skill:context7-cli
```
