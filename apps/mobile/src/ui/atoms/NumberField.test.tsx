import { fireEvent, render, screen } from '@testing-library/react-native';
import { UnitsProvider } from '../units';
import { NumberField } from './NumberField';

async function setup(
  unitSystem: 'imperial' | 'metric',
  value: number | null,
  onChange = jest.fn(),
) {
  await render(
    <UnitsProvider unitSystem={unitSystem}>
      <NumberField label="Weight" quantity="weight" value={value} onChangeValue={onChange} />
    </UnitsProvider>,
  );
  return onChange;
}

describe('NumberField units', () => {
  it('shows the stored value in lb with an lb suffix in imperial', async () => {
    await setup('imperial', 180.8);
    expect(screen.getByLabelText('Weight').props.value).toBe('180.8');
    expect(screen.getByText('lb')).toBeTruthy();
  });

  it('shows the same stored value in kg in metric (180.8 lb ≈ 82.0 kg)', async () => {
    await setup('metric', 180.78);
    expect(screen.getByLabelText('Weight').props.value).toBe('82');
    expect(screen.getByText('kg')).toBeTruthy();
  });

  it('shows lengths in in / cm', async () => {
    await render(
      <UnitsProvider unitSystem="metric">
        <NumberField label="Waist" quantity="length" value={34} onChangeValue={jest.fn()} />
      </UnitsProvider>,
    );
    expect(screen.getByLabelText('Waist').props.value).toBe('86.4');
    expect(screen.getByText('cm')).toBeTruthy();
  });

  it('reports the canonical (lb) value when the user types in kg', async () => {
    const onChange = await setup('metric', null);
    await fireEvent.changeText(screen.getByLabelText('Weight'), '82');
    expect(onChange).toHaveBeenLastCalledWith(expect.closeTo(180.78, 1));
  });

  it('reports null for empty or non-numeric input', async () => {
    const onChange = await setup('imperial', 180);
    await fireEvent.changeText(screen.getByLabelText('Weight'), '');
    expect(onChange).toHaveBeenLastCalledWith(null);
    await fireEvent.changeText(screen.getByLabelText('Weight'), 'abc');
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('shows a plain unit with no conversion', async () => {
    await render(<NumberField label="Grams" unit="g" value={50} onChangeValue={jest.fn()} />);
    expect(screen.getByLabelText('Grams').props.value).toBe('50');
    expect(screen.getByText('g')).toBeTruthy();
  });
});
