import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

const field =
  'mt-1.5 w-full rounded-xl border border-border bg-white px-3.5 py-2.5 font-sans text-sm text-ink placeholder:text-muted/70';

export function Input(props: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  const { label, className = '', id, ...rest } = props;
  return (
    <label className="block font-sans text-sm text-ink" htmlFor={id}>
      {label}
      <input id={id} className={field + ' ' + className} {...rest} />
    </label>
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  const { label, className = '', id, children, ...rest } = props;
  return (
    <label className="block font-sans text-sm text-ink" htmlFor={id}>
      {label}
      <select id={id} className={field + ' ' + className} {...rest}>
        {children}
      </select>
    </label>
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  const { label, className = '', id, ...rest } = props;
  return (
    <label className="block font-sans text-sm text-ink" htmlFor={id}>
      {label}
      <textarea id={id} className={field + ' ' + className} {...rest} />
    </label>
  );
}
