import { isPseudo } from '../net/protocol';

const KEY = 'nayosbeat.pseudo';

/** The online name (docs/multijoueur.md §7): asked once, kept on the device. */
export interface NameStore {
  /** The name kept, or '' (none yet, or one no longer valid). */
  load(): string;
  save(name: string): void;
}

/** The device's storage, which may refuse (private browsing): the name then holds this session. */
export const nameStore: NameStore = {
  load: () => {
    try {
      const name = localStorage.getItem(KEY);
      return isPseudo(name) ? name : '';
    } catch {
      return '';
    }
  },
  save: (name) => {
    try {
      localStorage.setItem(KEY, name);
    } catch {
      // Not kept: asked again next time.
    }
  },
};
