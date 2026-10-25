const ARTICLE = /^(the|a|an)\s+/i;

const tidy = (value: string) => value.trim().replace(/\s+/g, ' ');

// "The Dispossessed" sorts as "dispossessed".
export const sortTitle = (title: string) => tidy(title).replace(ARTICLE, '').toLowerCase();

// "Alan Moore" sorts as "moore, alan". A name typed with a comma keeps its own
// split, so "Le Guin, Ursula K." sorts as typed.
export const sortName = (name: string) => {
  const words = tidy(name).replace(/^the\s+/i, '');

  if (words.includes(',')) return words.toLowerCase();

  const parts = words.split(' ');
  const last = parts.pop() ?? '';

  return (parts.length ? `${last}, ${parts.join(' ')}` : last).toLowerCase();
};
