import type { ReactNode } from 'react';
import {
  Controller,
  FormProvider,
  useForm,
  useFormContext,
  type DefaultValues,
  type FieldValues,
  type Path,
  type SubmitHandler,
  type UseFormReturn,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ZodType } from 'zod';
import { cn } from '@/lib/cn';
import { Field, fieldControlProps } from './Field';
import { Input, type InputProps } from './Input';
import { Textarea, type TextareaProps } from './Textarea';
import { Select, type SelectProps } from './Select';
import { DatePicker, type DatePickerProps } from './DatePicker';
import { Toggle, type ToggleProps } from './Toggle';
import { Checkbox, type CheckboxProps } from './Checkbox';
import { RadioGroup, type RadioGroupProps } from './Radio';
import { OTPInput, type OTPInputProps } from './OTPInput';
import { FileUpload, type FileUploadProps } from './FileUpload';

/* ----------------------------------------------------------------
   <Form> — RHF + Zod, validation-driven, accessible.
   ---------------------------------------------------------------- */

export interface FormProps<T extends FieldValues> {
  schema: ZodType<T>;
  defaultValues: DefaultValues<T>;
  onSubmit: (values: T, methods: UseFormReturn<T>) => void | Promise<void>;
  /** RHF validation strategy. Default 'onTouched' (validate after first blur). */
  mode?: 'onSubmit' | 'onBlur' | 'onChange' | 'onTouched' | 'all';
  children: ReactNode | ((methods: UseFormReturn<T>) => ReactNode);
  id?: string;
  className?: string;
}

export function Form<T extends FieldValues>({
  schema,
  defaultValues,
  onSubmit,
  mode = 'onTouched',
  children,
  id,
  className,
}: FormProps<T>) {
  const methods = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues,
    mode,
  });

  const submit: SubmitHandler<T> = (values) => onSubmit(values, methods);

  return (
    <FormProvider {...methods}>
      <form
        id={id}
        className={cn('nx-form', className)}
        onSubmit={methods.handleSubmit(submit)}
        noValidate
      >
        {typeof children === 'function' ? children(methods) : children}
      </form>
    </FormProvider>
  );
}

/* ----------------------------------------------------------------
   Shared helpers for connected fields.
   ---------------------------------------------------------------- */

/** Safely read a (possibly nested) error message by field path. */
function errorAt(errors: Record<string, unknown>, name: string): string | undefined {
  const node = name.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, errors);
  if (node && typeof node === 'object' && 'message' in node) {
    const m = (node as { message?: unknown }).message;
    return typeof m === 'string' ? m : undefined;
  }
  return undefined;
}

interface FieldShellProps {
  name: string;
  label?: ReactNode;
  hint?: ReactNode;
  required?: boolean;
  optional?: boolean;
  labelAction?: ReactNode;
  fieldClassName?: string;
}

/* ----------------------------------------------------------------
   Connected fields (use inside <Form> / a FormProvider).
   ---------------------------------------------------------------- */

export function FormInput<T extends FieldValues = FieldValues>({
  name,
  label,
  hint,
  required,
  optional,
  labelAction,
  fieldClassName,
  ...input
}: FieldShellProps & Omit<InputProps, 'name'>) {
  const {
    register,
    formState: { errors },
  } = useFormContext<T>();
  const error = errorAt(errors, name);
  const id = `f-${name}`;
  const reg = register(name as Path<T>);

  return (
    <Field
      label={label}
      htmlFor={id}
      required={required}
      optional={optional}
      hint={hint}
      error={error}
      labelAction={labelAction}
      className={fieldClassName}
    >
      <Input {...input} {...reg} {...fieldControlProps(id, !!error, !!error || hint != null)} invalid={!!error} />
    </Field>
  );
}

export function FormTextarea<T extends FieldValues = FieldValues>({
  name,
  label,
  hint,
  required,
  optional,
  labelAction,
  fieldClassName,
  ...ta
}: FieldShellProps & Omit<TextareaProps, 'name'>) {
  const {
    register,
    formState: { errors },
  } = useFormContext<T>();
  const error = errorAt(errors, name);
  const id = `f-${name}`;
  const reg = register(name as Path<T>);
  return (
    <Field
      label={label}
      htmlFor={id}
      required={required}
      optional={optional}
      hint={hint}
      error={error}
      labelAction={labelAction}
      className={fieldClassName}
    >
      <Textarea {...ta} {...reg} {...fieldControlProps(id, !!error, !!error || hint != null)} invalid={!!error} />
    </Field>
  );
}

export function FormSelect<T extends FieldValues = FieldValues>({
  name,
  label,
  hint,
  required,
  optional,
  labelAction,
  fieldClassName,
  ...select
}: FieldShellProps & Omit<SelectProps, 'name'>) {
  const {
    register,
    formState: { errors },
    watch,
  } = useFormContext<T>();
  const error = errorAt(errors, name);
  const id = `f-${name}`;
  const reg = register(name as Path<T>);
  const value = watch(name as Path<T>) as unknown as string;
  return (
    <Field
      label={label}
      htmlFor={id}
      required={required}
      optional={optional}
      hint={hint}
      error={error}
      labelAction={labelAction}
      className={fieldClassName}
    >
      <Select
        {...select}
        {...reg}
        value={value ?? ''}
        {...fieldControlProps(id, !!error, !!error || hint != null)}
        invalid={!!error}
      />
    </Field>
  );
}

export function FormDate<T extends FieldValues = FieldValues>({
  name,
  label,
  hint,
  required,
  optional,
  labelAction,
  fieldClassName,
  ...dp
}: FieldShellProps & Omit<DatePickerProps, 'name'>) {
  const {
    register,
    formState: { errors },
  } = useFormContext<T>();
  const error = errorAt(errors, name);
  const id = `f-${name}`;
  const reg = register(name as Path<T>);
  return (
    <Field
      label={label}
      htmlFor={id}
      required={required}
      optional={optional}
      hint={hint}
      error={error}
      labelAction={labelAction}
      className={fieldClassName}
    >
      <DatePicker {...dp} {...reg} {...fieldControlProps(id, !!error, !!error || hint != null)} invalid={!!error} />
    </Field>
  );
}

export function FormToggle<T extends FieldValues = FieldValues>({
  name,
  fieldClassName,
  ...toggle
}: { name: string; fieldClassName?: string } & Omit<ToggleProps, 'checked' | 'onChange'>) {
  const { control } = useFormContext<T>();
  return (
    <Controller
      control={control}
      name={name as Path<T>}
      render={({ field }) => (
        <Toggle
          {...toggle}
          className={fieldClassName}
          checked={!!field.value}
          onChange={(v) => field.onChange(v)}
        />
      )}
    />
  );
}

export function FormCheckbox<T extends FieldValues = FieldValues>({
  name,
  fieldClassName,
  ...cb
}: { name: string; fieldClassName?: string } & Omit<CheckboxProps, 'checked' | 'onChange'>) {
  const {
    control,
    formState: { errors },
  } = useFormContext<T>();
  const error = errorAt(errors, name);
  return (
    <Controller
      control={control}
      name={name as Path<T>}
      render={({ field }) => (
        <Checkbox
          {...cb}
          className={fieldClassName}
          invalid={!!error || cb.invalid}
          checked={!!field.value}
          onChange={(v) => field.onChange(v)}
        />
      )}
    />
  );
}

export function FormRadioGroup<T extends FieldValues = FieldValues>({
  name,
  label,
  hint,
  required,
  optional,
  fieldClassName,
  ...rg
}: FieldShellProps & Omit<RadioGroupProps, 'value' | 'onChange' | 'name'>) {
  const {
    control,
    formState: { errors },
  } = useFormContext<T>();
  const error = errorAt(errors, name);
  const labelId = `f-${name}-lbl`;
  return (
    <Field
      label={label ? <span id={labelId}>{label}</span> : undefined}
      required={required}
      optional={optional}
      hint={hint}
      error={error}
      className={fieldClassName}
    >
      <Controller
        control={control}
        name={name as Path<T>}
        render={({ field }) => (
          <RadioGroup
            {...rg}
            name={name}
            aria-labelledby={label ? labelId : undefined}
            invalid={!!error}
            value={(field.value as string) ?? ''}
            onChange={(v) => field.onChange(v)}
          />
        )}
      />
    </Field>
  );
}

export function FormOTP<T extends FieldValues = FieldValues>({
  name,
  label,
  hint,
  required,
  fieldClassName,
  ...otp
}: FieldShellProps & Omit<OTPInputProps, 'value' | 'onChange'>) {
  const {
    control,
    formState: { errors },
  } = useFormContext<T>();
  const error = errorAt(errors, name);
  return (
    <Field label={label} required={required} hint={hint} error={error} className={fieldClassName}>
      <Controller
        control={control}
        name={name as Path<T>}
        render={({ field }) => (
          <OTPInput
            {...otp}
            invalid={!!error}
            value={(field.value as string) ?? ''}
            onChange={(v) => field.onChange(v)}
          />
        )}
      />
    </Field>
  );
}

export function FormFileUpload<T extends FieldValues = FieldValues>({
  name,
  label,
  hint,
  required,
  optional,
  fieldClassName,
  ...fu
}: FieldShellProps & Omit<FileUploadProps, 'value' | 'onChange'>) {
  const {
    control,
    formState: { errors },
  } = useFormContext<T>();
  const error = errorAt(errors, name);
  return (
    <Field label={label} required={required} optional={optional} hint={hint} error={error} className={fieldClassName}>
      <Controller
        control={control}
        name={name as Path<T>}
        render={({ field }) => (
          <FileUpload
            {...fu}
            invalid={!!error}
            value={(field.value as string | null) ?? null}
            onChange={(url) => field.onChange(url)}
          />
        )}
      />
    </Field>
  );
}
