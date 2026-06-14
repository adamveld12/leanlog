import { type InputHTMLAttributes, type Ref } from 'react';
import { Input } from './Input';

type FileInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  ref?: Ref<HTMLInputElement>;
};

export function FileInput({ ref, ...props }: FileInputProps) {
  return <Input ref={ref} type="file" {...props} />;
}
