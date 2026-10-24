// Joins class names, skipping empty ones: cx('field', props.class).
export const joinClassNames = (...names: (string | undefined)[]) => names.filter(Boolean).join(' ');
