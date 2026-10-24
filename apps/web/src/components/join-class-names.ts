// Joins class names, skipping empty ones: joinClassNames('field', props.class).
export const joinClassNames = (...names: (string | undefined)[]) => names.filter(Boolean).join(' ');
