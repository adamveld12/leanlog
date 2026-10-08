// Oxlint JS plugin: bans raw HTML elements in favour of @leanlog/ui atoms.
// Replaces the ESLint `no-restricted-syntax` JSXOpeningElement selectors.
const BANNED = {
  button: 'Use <Button> from @leanlog/ui instead of raw <button>',
  input: 'Use <Input>, <NumberInput>, or <IntegerInput> from @leanlog/ui instead of raw <input>',
  select: 'Use <Select> from @leanlog/ui instead of raw <select>',
  textarea: 'Use a design system atom instead of raw <textarea>',
  label: 'Use <Label> from @leanlog/ui instead of raw <label>',
  small: 'Use <WarningText> or <HelperText> instead of raw <small>',
  h3: 'Use <SectionHeading> instead of raw <h3>',
  h4: 'Use <SectionHeading as="h4"> instead of raw <h4>',
  p: 'Use <HelperText>, <Text>, or a design system component instead of raw <p>',
  span: 'Use <UnitText>, <Text>, or a design system component instead of raw <span>',
  a: 'Use <Button> with as="a" or a router Link component instead of raw <a>',
};

const noRawElements = {
  create(context) {
    return {
      JSXOpeningElement(node) {
        const name = node.name;
        if (name.type !== 'JSXIdentifier') return;
        if (!Object.hasOwn(BANNED, name.name)) return;
        context.report({ node, message: BANNED[name.name] });
      },
    };
  },
};

export default {
  meta: { name: 'leanlog' },
  rules: { 'no-raw-elements': noRawElements },
};
