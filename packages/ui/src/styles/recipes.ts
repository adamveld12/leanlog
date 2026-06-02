export const recipes = {
  focusRing:
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--ll-focus)_35%,transparent)]',
  ring: { today: 'ring-2 ring-[var(--ll-line-strong)]' },
  controlDisabled: 'disabled:opacity-50 disabled:cursor-not-allowed',
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
    tracked: 'font-semibold text-[var(--ll-saved)]',
    missed: 'font-semibold text-[var(--ll-danger)]',
  },
  page: {
    shell: 'mx-auto min-h-screen w-full max-w-[620px] p-4 pb-24 text-[var(--ll-text)]',
    main: 'flex flex-col gap-4',
  },
  stack: {
    xs: 'flex flex-col gap-1.5',
    sm: 'flex flex-col gap-2.5',
    md: 'flex flex-col gap-3',
    lg: 'flex flex-col gap-4',
    row: 'flex items-center gap-2',
    rowMd: 'flex items-center gap-3',
    rowEnd: 'flex items-end gap-2',
    actions: 'flex flex-wrap items-center justify-end gap-2',
    rowBetween: 'flex items-center justify-between',
    between: 'justify-between',
    center: 'flex justify-center text-center',
    centerFull: 'flex items-center justify-center text-center',
  },
  grid: {
    two: 'grid grid-cols-2 gap-2',
    carbFiber: 'grid grid-cols-3 gap-2 [&>*:first-child]:col-span-2',
    calendar7: 'grid grid-cols-7 gap-0.5',
  },
  calendar: {
    dayHeader: 'py-1 text-center',
    // my-0 intentionally overrides the my-2.5 control margin; min-h-[44px]
    // keeps the 44px touch target on every day cell.
    cell: 'my-0 flex min-h-[44px] items-center justify-center',
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
    base: 'my-2.5 h-11 w-full rounded-[10px] border border-[var(--ll-line)] bg-[var(--ll-surface)] px-3 text-sm text-[var(--ll-text)] outline-none transition duration-[140ms] ease-[var(--ll-ease)] focus-visible:border-[var(--ll-line-strong)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--ll-focus)_35%,transparent)] disabled:opacity-50 disabled:cursor-not-allowed',
  },
} as const;
