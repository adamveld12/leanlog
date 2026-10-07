import { fireEvent, render, screen } from '@testing-library/react-native';
import { RadioGroup } from './RadioGroup';

const options = [
  { value: 'navy', label: 'Navy tape' },
  { value: 'jp3', label: 'Skinfold' },
] as const;

describe('RadioGroup', () => {
  it('exposes radio roles with the checked state', async () => {
    await render(<RadioGroup label="Method" options={options} value="navy" onChange={jest.fn()} />);
    // The group is a container (not itself an accessibility element), so look it up by label.
    expect(screen.getByLabelText('Method').props.accessibilityRole).toBe('radiogroup');
    expect(screen.getByRole('radio', { name: 'Navy tape', checked: true })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Skinfold', checked: false })).toBeTruthy();
  });

  it('calls onChange with the pressed option', async () => {
    const onChange = jest.fn();
    await render(<RadioGroup label="Method" options={options} value="navy" onChange={onChange} />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Skinfold' }));
    expect(onChange).toHaveBeenCalledWith('jp3');
  });
});
