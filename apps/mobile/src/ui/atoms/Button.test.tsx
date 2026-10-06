import { fireEvent, render, screen } from '@testing-library/react-native';
import { Button } from './Button';

describe('Button', () => {
  it('presses and exposes a button role', async () => {
    const onPress = jest.fn();
    await render(<Button label="Save 17%" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Save 17%' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not press when disabled and reports the disabled state', async () => {
    const onPress = jest.fn();
    await render(<Button label="Save" disabled onPress={onPress} />);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button.props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});
