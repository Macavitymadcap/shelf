import type { Child, FC } from 'hono/jsx';
import { Input, type InputProps } from '../atoms/input.tsx';
import { Select, type SelectProps } from '../atoms/select.tsx';
import { Textarea, type TextareaProps } from '../atoms/textarea.tsx';
import { joinClassNames } from '../join-class-names.ts';

type FrameProps = {
  label: string;
  name: string;
  id?: string;
  hint?: string;
  error?: string;
  class?: string;
};

// The label, hint and error around any control; the control is told which notes describe it.
const frame = (props: FrameProps, control: (aria: Record<string, string>) => Child) => {
  const id = props.id ?? `field-${props.name}`;
  const notes = [props.hint && `${id}-hint`, props.error && `${id}-error`].filter(Boolean);
  const aria = { id, name: props.name, 'aria-invalid': props.error ? 'true' : 'false' };
  return (
    <div class={joinClassNames('field', props.class)}>
      <label class="field__label" for={id}>
        {props.label}
      </label>
      {control(notes.length ? { ...aria, 'aria-describedby': notes.join(' ') } : aria)}
      {props.hint && (
        <p class="field__hint" id={`${id}-hint`}>
          {props.hint}
        </p>
      )}
      {props.error && (
        <p class="field__error" id={`${id}-error`}>
          {props.error}
        </p>
      )}
    </div>
  );
};

export const Field: FC<InputProps & FrameProps> = (props) => {
  const { label, name, id, hint, error, class: className, ...input } = props;
  return frame({ label, name, id, hint, error, class: className }, (aria) => (
    <Input {...input} {...aria} />
  ));
};

export const SelectField: FC<SelectProps & FrameProps> = (props) => {
  const { label, name, id, hint, error, class: className, ...select } = props;
  return frame({ label, name, id, hint, error, class: className }, (aria) => (
    <Select {...select} {...aria} />
  ));
};

export const TextareaField: FC<TextareaProps & FrameProps> = (props) => {
  const { label, name, id, hint, error, class: className, ...textarea } = props;
  return frame({ label, name, id, hint, error, class: className }, (aria) => (
    <Textarea {...textarea} {...aria} />
  ));
};
