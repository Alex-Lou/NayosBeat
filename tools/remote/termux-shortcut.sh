#!/data/data/com.termux/files/usr/bin/bash
# Run in Termux itself, not in Debian: puts a one-tap "NayosBeat" shortcut on the phone's home
# screen, through the Termux:Widget app (docs/reprise.md §6). The tap keeps Termux awake, enters
# Debian and runs `tools/remote/nayos.sh claude`: the Free Claude Code server if it is not up,
# then Claude Code in the NayosBeat clone, inside tmux.
#
#   bash $PREFIX/var/lib/proot-distro/installed-rootfs/debian/root/NayosBeat/tools/remote/termux-shortcut.sh

set -euo pipefail

if [ -z "${PREFIX:-}" ] || [[ "$PREFIX" != *com.termux* ]]; then
  echo "À lancer dans Termux, pas dans Debian (tape exit pour sortir de Debian)." >&2
  exit 1
fi

shortcuts="$HOME/.shortcuts"
mkdir -p "$shortcuts"
chmod 700 "$shortcuts"

cat >"$shortcuts/NayosBeat" <<'SHORTCUT'
#!/data/data/com.termux/files/usr/bin/bash
# One tap: Claude Code on NayosBeat (written by tools/remote/termux-shortcut.sh).
termux-wake-lock 2>/dev/null || true
exec proot-distro login debian -- bash -lc 'cd ~/NayosBeat && exec bash tools/remote/nayos.sh claude'
SHORTCUT

cat >"$shortcuts/NayosBeat-menu" <<'SHORTCUT'
#!/data/data/com.termux/files/usr/bin/bash
# One tap: the NayosBeat cockpit (checks, dev server, state; written by termux-shortcut.sh).
termux-wake-lock 2>/dev/null || true
exec proot-distro login debian -- bash -lc 'cd ~/NayosBeat && exec bash tools/remote/nayos.sh'
SHORTCUT

chmod 700 "$shortcuts/NayosBeat" "$shortcuts/NayosBeat-menu"
echo "Raccourcis prêts : NayosBeat (Claude Code) et NayosBeat-menu (le cockpit)."
echo "Installe Termux:Widget depuis F-Droid, puis ajoute son widget sur l'écran d'accueil."
