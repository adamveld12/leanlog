import { forwardRef, type InputHTMLAttributes } from 'react';
import { Input } from './Input';

type FileInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

export const FileInput = forwardRef<HTMLInputElement, FileInputProps>(
  function FileInput(props, ref) {
    return <Input ref={ref} type="file" {...props} />;
  },
);
