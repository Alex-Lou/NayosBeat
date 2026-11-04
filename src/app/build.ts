/** The build's date and time, in the player's time zone ("26/10/2026 23:41"). */
export function buildDate(): string {
  const date = new Date(__BUILD_DATE__);
  return `${date.toLocaleDateString('fr-FR')} ${date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}
