export const recipes = {
  focusRing:
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--ll-focus)_35%,transparent)]',
  transition: 'transition duration-[140ms] ease-[var(--ll-ease)]',
  radius: { control: 'rounded-[10px]', card: 'rounded-[14px]', pill: 'rounded-[999px]' },
  surface: {
    card: 'border border-[var(--ll-line)] bg-[var(--ll-surface)]',
    overlay: 'bg-[color-mix(in_srgb,var(--ll-surface)_88%,transparent)]',
  },
  text: {
    title: 'text-2xl font-semibold tracking-tight text-[var(--ll-text)]',
    sectionHeading:
      'mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ll-text-muted)]',
    body: 'text-sm leading-5 font-normal text-[var(--ll-text)]',
    meta: 'text-xs leading-4 font-medium text-[var(--ll-text-muted)]',
    pageSubtitle: 'text-sm font-medium text-[var(--ll-text-muted)]',
    warn: 'text-xs font-medium text-[var(--ll-warn)]',
  },
  page: {
    shell: 'mx-auto min-h-screen w-full max-w-[620px] p-4 pb-24 text-[var(--ll-text)]',
    main: 'flex flex-col gap-4',
  },
  stack: {
    xs: 'flex flex-col gap-1.5',
    sm: 'flex flex-col gap-2.5',
    lg: 'flex flex-col gap-4',
    row: 'flex items-center gap-2',
    rowEnd: 'flex items-end gap-2',
    between: 'justify-between',
  },
  grid: {
    two: 'grid grid-cols-2 gap-2',
    carbFiber: 'grid grid-cols-3 gap-2 [&>*:first-child]:col-span-2',
  },
  control: {
    base: 'my-2.5 inline-flex items-center justify-center text-sm font-semibold disabled:opacity-50',
    size: { md: 'h-11 px-4', sm: 'h-9 px-3 text-xs' },
  },
  button: {
    primary: 'bg-[var(--ll-text)] text-[var(--ll-surface)] hover:brightness-[1.06]',
    secondary:
      'border border-[var(--ll-line-strong)] bg-[var(--ll-surface)] text-[var(--ll-text)] hover:bg-[color-mix(in_srgb,var(--ll-line)_25%,transparent)]',
    ghost:
      'border border-[var(--ll-line)] bg-transparent text-[var(--ll-text)] hover:bg-[color-mix(in_srgb,var(--ll-line)_25%,transparent)]',
    danger: 'bg-[var(--ll-danger)] text-white',
    subtle:
      'bg-transparent text-[var(--ll-text-muted)] hover:bg-[color-mix(in_srgb,var(--ll-line)_25%,transparent)] hover:text-[var(--ll-text)]',
  },
  input: {
    base: 'my-2.5 h-11 w-full rounded-[10px] border border-[var(--ll-line)] bg-[var(--ll-surface)] px-3 text-sm text-[var(--ll-text)] outline-none transition duration-[140ms] ease-[var(--ll-ease)] focus-visible:border-[var(--ll-line-strong)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--ll-focus)_35%,transparent)]',
  },
} as const;
