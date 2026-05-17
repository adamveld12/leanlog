import type { InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className = '', ...props }: InputProps) {
  return (
    <input
      className={className}
      style={{
        height: 44,
        width: '100%',
        borderRadius: 12,
        border: '1px solid #d4d4d4',
        padding: '0 12px',
        fontSize: 14,
      }}
      {...props}
    />
  );
}
