'use client';

import {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  useId,
} from 'react';

const fieldBase =
  'mt-1.5 w-full rounded-control border bg-surface px-3.5 py-2.5 font-sans text-small text-ink placeholder:text-muted/70 transition-colors duration-fast focus-visible:border-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/20 disabled:cursor-not-allowed disabled:bg-subtle disabled:opacity-60';

type FieldExtras = {
  label?: string;
  error?: string;
  hint?: string;
};

export function Input({
  label,
  error,
  hint,
  className = '',
  id,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & FieldExtras) {
  const autoId = useId();
  const fieldId = id || autoId;
  const border = error ? 'border-coral' : 'border-border';
  return (
    <div className="focus-host block">
      {label ? (
        <label htmlFor={fieldId} className="font-sans text-small font-medium text-ink">
          {label}
        </label>
      ) : null}
      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? fieldId + '-err' : hint ? fieldId + '-hint' : undefined}
        className={fieldBase + ' ' + border + ' ' + className}
        {...rest}
      />
      {hint && !error ? (
        <p id={fieldId + '-hint'} className="mt-1.5 font-sans text-caption text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={fieldId + '-err'} className="mt-1.5 font-sans text-caption text-coral" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Select({
  label,
  error,
  hint,
  className = '',
  id,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & FieldExtras) {
  const autoId = useId();
  const fieldId = id || autoId;
  const border = error ? 'border-coral' : 'border-border';
  return (
    <div className="focus-host block">
      {label ? (
        <label htmlFor={fieldId} className="font-sans text-small font-medium text-ink">
          {label}
        </label>
      ) : null}
      <select
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? fieldId + '-err' : hint ? fieldId + '-hint' : undefined}
        className={fieldBase + ' ' + border + ' ' + className}
        {...rest}
      >
        {children}
      </select>
      {hint && !error ? (
        <p id={fieldId + '-hint'} className="mt-1.5 font-sans text-caption text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={fieldId + '-err'} className="mt-1.5 font-sans text-caption text-coral" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Textarea({
  label,
  error,
  hint,
  className = '',
  id,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & FieldExtras) {
  const autoId = useId();
  const fieldId = id || autoId;
  const border = error ? 'border-coral' : 'border-border';
  return (
    <div className="focus-host block">
      {label ? (
        <label htmlFor={fieldId} className="font-sans text-small font-medium text-ink">
          {label}
        </label>
      ) : null}
      <textarea
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? fieldId + '-err' : hint ? fieldId + '-hint' : undefined}
        className={fieldBase + ' ' + border + ' ' + className}
        {...rest}
      />
      {hint && !error ? (
        <p id={fieldId + '-hint'} className="mt-1.5 font-sans text-caption text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={fieldId + '-err'} className="mt-1.5 font-sans text-caption text-coral" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Checkbox({
  label,
  className = '',
  id,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const autoId = useId();
  const fieldId = id || autoId;
  return (
    <label htmlFor={fieldId} className="inline-flex items-center gap-2 font-sans text-small text-ink">
      <input
        id={fieldId}
        type="checkbox"
        className={
          'h-4 w-4 rounded border-border text-teal transition-colors duration-fast focus:ring-2 focus:ring-teal/20 ' +
          className
        }
        {...rest}
      />
      {label}
    </label>
  );
}

export function Radio({
  label,
  className = '',
  id,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const autoId = useId();
  const fieldId = id || autoId;
  return (
    <label htmlFor={fieldId} className="inline-flex items-center gap-2 font-sans text-small text-ink">
      <input
        id={fieldId}
        type="radio"
        className={
          'h-4 w-4 border-border text-teal transition-colors duration-fast focus:ring-2 focus:ring-teal/20 ' +
          className
        }
        {...rest}
      />
      {label}
    </label>
  );
}
