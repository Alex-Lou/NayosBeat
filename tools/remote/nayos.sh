#!/usr/bin/env bash
# The phone's cockpit for NayosBeat (docs/reprise.md): one short command, big choices, little
# typing. Inside tmux, so a dropped connection loses nothing. It reads, checks and runs; it never
# pushes nor merges: publishing stays a deliberate act (`git push`, `gh pr merge`).
#
#   npm run nayos            the menu, in the tmux session "nayos"
#   npm run nayos -- check   one action straight away: agent, claude, check, dev, sync, status, prs
#
# On the phone, `claude` is what the home screen's one tap runs (tools/remote/termux-shortcut.sh):
# it starts the Free Claude Code server if it is not up, then Claude Code, in tmux.

set -euo pipefail

root=$(cd "$(dirname "$0")/../.." && pwd)
cd "$root"
# uv puts its tools (fcc-server, fcc-claude) here; a login shell from a shortcut may not have it.
export PATH="$HOME/.local/bin:$PATH"
has() { command -v "$1" >/dev/null 2>&1; }

# Free Claude Code's local server, on this machine only (its Admin UI: http://localhost:8082/admin).
FCC_URL=http://127.0.0.1:8082/

# Starts the Free Claude Code server if its port does not answer yet (any HTTP status counts),
# and waits for it (20 s at most).
fcc_up() {
  if curl -sS -o /dev/null "$FCC_URL" 2>/dev/null; then return 0; fi
  echo "Démarrage du serveur Free Claude Code…"
  nohup fcc-server >"$HOME/fcc.log" 2>&1 &
  for _ in $(seq 20); do
    sleep 1
    if curl -sS -o /dev/null "$FCC_URL" 2>/dev/null; then return 0; fi
  done
  echo "Le serveur ne répond pas : voir $HOME/fcc.log" >&2
  return 1
}

agent() {
  if has opencode; then exec opencode; fi
  echo "OpenCode n'est pas installé : tools/remote/setup.sh --opencode" >&2
  return 1
}

claude() {
  if has fcc-claude; then
    fcc_up || return 1
    exec fcc-claude
  fi
  echo "Free Claude Code n'est pas installé : tools/remote/setup.sh --fcc" >&2
  return 1
}

check() {
  npm run check
  npm run replays:update >/dev/null
  if [ -n "$(git status --porcelain -- tests/core/replays)" ]; then
    echo "Attention : les replays dorés ont bougé (git status). À expliquer avant de pousser." >&2
    return 1
  fi
  echo "Toute la CI est verte, replays inchangés."
}

dev() {
  local ip=""
  if has tailscale; then ip=$(tailscale ip -4 2>/dev/null | head -1 || true); fi
  echo
  if [ -n "$ip" ]; then
    echo "Sur le téléphone : http://$ip:5173"
  else
    echo "Sur ce même appareil : http://localhost:5173"
  fi
  echo "(Ctrl+C pour arrêter)"
  echo
  npm run dev
}

sync() {
  git fetch origin main
  if [ "$(git branch --show-current)" = main ] && [ -z "$(git status --porcelain)" ]; then
    git pull --ff-only origin main
  else
    echo "Branche $(git branch --show-current) : main est à jour dans origin/main."
    echo "Pour la reprendre : git merge origin/main"
  fi
}

status() {
  git status -sb
  echo
  git log --oneline -5
}

prs() {
  if has gh; then gh pr list; else echo "gh n'est pas installé." >&2; fi
}

menu() {
  while true; do
    echo
    echo "=== NayosBeat ($(git branch --show-current)) ==="
    echo " 1) Agent (OpenCode)"
    echo " 2) Agent (Claude Code via Free Claude Code)"
    echo " 3) Contrôles de la CI"
    echo " 4) Serveur de dev (tester sur le téléphone)"
    echo " 5) Récupérer main"
    echo " 6) État du dépôt"
    echo " 7) PR ouvertes"
    echo " q) Quitter"
    read -r -p "> " choice
    case "$choice" in
      1) (agent) || true ;;
      2) (claude) || true ;;
      3) (check) || true ;;
      4) (dev) || true ;;
      5) (sync) || true ;;
      6) (status) || true ;;
      7) (prs) || true ;;
      q | Q) return 0 ;;
      *) echo "Choix inconnu." ;;
    esac
  done
}

case "${1:-}" in
  "")
    if [ -z "${TMUX:-}" ] && has tmux; then exec tmux new -A -s nayos "$0" menu; fi
    menu
    ;;
  menu) menu ;;
  # An agent runs in tmux too: closing the terminal does not stop it, the next tap finds it again.
  agent | claude)
    if [ -z "${TMUX:-}" ] && has tmux; then exec tmux new -A -s "nayos-$1" "$0" "$1"; fi
    "$1"
    ;;
  check | dev | sync | status | prs) "$1" ;;
  *)
    echo "Action inconnue : $1 (agent, claude, check, dev, sync, status, prs)" >&2
    exit 2
    ;;
esac
