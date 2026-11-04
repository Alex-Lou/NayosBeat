/** The game's logo, its O a vinyl turning (Nayo's record, title-vinyl.png): read whole. */
export function titleLogo(className = 'title-logo'): HTMLHeadingElement {
  const title = document.createElement('h1');
  title.className = className;
  title.setAttribute('aria-label', 'NAYOSBEAT');
  const vinyl = document.createElement('span');
  vinyl.className = 'title-vinyl';
  title.append(logoPart('NAY'), vinyl, logoPart('SBEAT'));
  return title;
}

/** Letters of the logo around its vinyl, hidden from screen readers (the title has its label). */
function logoPart(text: string): HTMLSpanElement {
  const part = document.createElement('span');
  part.textContent = text;
  part.setAttribute('aria-hidden', 'true');
  return part;
}
