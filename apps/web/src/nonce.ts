import { createContext, useContext } from 'hono/jsx';

// The reposne's CSP nonce, provided once by render() so any component can read it.
export const NonceContext = createContext('');

// Every element with an hx- attribute needs these: hx-csp strips htmx from any without.
export const useHx = () => ({ 'hx-nonce': useContext(NonceContext) });
