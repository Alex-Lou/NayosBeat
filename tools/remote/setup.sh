#!/usr/bin/env bash
# Prepares a machine to work on NayosBeat from a phone (docs/reprise.md): a PC at home reached
# through Tailscale, or Termux on the phone itself. Checks the tools, installs the dependencies,
# and on request an agent: OpenCode (--opencode) or Free Claude Code, pinned (--fcc).
# Never pushes, merges or stores a key: the keys go into each tool's own configuration.
#
#   tools/remote/setup.sh [--opencode] [--fcc] [--skip-install]

set -euo pipefail

# Free Claude Code, alone and pinned (PyPI, AGPL-3.0): not its own installer, which would also
# fetch a dozen other agents at their latest version, one of them through a remote shell script.
FCC_VERSION=6.18.5
NODE_MAJOR=22

root=$(cd "$(dirname "$0")/../.." && pwd)
want_opencode=0
want_fcc=0
skip_install=0
for arg in "$@"; do
  case "$arg" in
    --opencode) want_opencode=1 ;;
    --fcc) want_fcc=1 ;;
    --skip-install) skip_install=1 ;;
    -h | --help)
      sed -n '2,7p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Option inconnue : $arg (voir --help)" >&2
      exit 2
      ;;
  esac
done

termux=0
if [ -n "${TERMUX_VERSION:-}" ] || [[ "${PREFIX:-}" == *com.termux* ]]; then termux=1; fi

ok() { printf '  ok      %s\n' "$1"; }
warn() { printf '  manque  %s\n' "$1"; }
has() { command -v "$1" >/dev/null 2>&1; }

echo "NayosBeat : préparation ($([ "$termux" = 1 ] && echo Termux || uname -s))"
echo

missing=0
if has git; then ok "git"; else
  warn "git : apt install git, ou pkg install git"
  missing=1
fi
if has node; then
  major=$(node -p 'process.versions.node.split(".")[0]')
  if [ "$major" -ge "$NODE_MAJOR" ]; then ok "node $(node -v)"; else
    warn "node $NODE_MAJOR au moins (trouvé $(node -v)) : nvm install $NODE_MAJOR, ou pkg install nodejs-lts"
    missing=1
  fi
else
  warn "node $NODE_MAJOR : nvm install $NODE_MAJOR, ou pkg install nodejs-lts"
  missing=1
fi
if has lua5.4 || has lua; then ok "lua (aseprite:check)"; else warn "lua 5.4, pour npm run aseprite:check : apt install lua5.4, ou pkg install lua54"; fi
if has tmux; then ok "tmux"; else warn "tmux, pour garder la session si le téléphone coupe : apt install tmux, ou pkg install tmux"; fi
if has gh; then ok "gh"; else warn "gh, pour les PR : https://cli.github.com, ou pkg install gh"; fi
if [ "$termux" = 0 ]; then
  if has tailscale; then ok "tailscale ($(tailscale ip -4 2>/dev/null | head -1 || echo 'non connecté'))"; else warn "tailscale : https://tailscale.com/download"; fi
fi

if [ "$missing" = 1 ]; then
  echo
  echo "Installe ce qui manque (git, node $NODE_MAJOR), puis relance ce script." >&2
  exit 1
fi

if [ "$skip_install" = 0 ]; then
  echo
  echo "Dépendances du jeu (npm ci)…"
  (cd "$root" && npm ci)
fi

if [ "$want_opencode" = 1 ]; then
  echo
  if has opencode; then
    ok "opencode déjà là"
  elif [ "$termux" = 1 ]; then
    echo "OpenCode ne tourne pas directement dans Termux. Voie sûre :"
    echo "  pkg install proot-distro && proot-distro install debian && proot-distro login debian"
    echo "puis, dans Debian : installer Node $NODE_MAJOR, puis npm install -g opencode-ai"
  else
    echo "Installation d'OpenCode (npm, paquet officiel opencode-ai)…"
    npm install -g opencode-ai
  fi
fi

if [ "$want_fcc" = 1 ]; then
  echo
  if [ "$termux" = 1 ]; then
    echo "Free Claude Code se lance sur le PC, pas dans Termux : relance --fcc sur le PC." >&2
    exit 1
  fi
  if ! has uv; then
    echo "Free Claude Code s'installe avec uv (https://docs.astral.sh/uv/) : installe-le, puis relance --fcc." >&2
    exit 1
  fi
  if has claude; then ok "claude déjà là"; else
    echo "Claude Code (npm, paquet officiel @anthropic-ai/claude-code)…"
    npm install -g @anthropic-ai/claude-code
  fi
  echo "Free Claude Code $FCC_VERSION seul (uv tool install, version figée)…"
  # It asks for Python 3.14.10 exactly: an old uv does not know it yet.
  if ! uv tool install --python 3.14.10 "free-claude-code==$FCC_VERSION"; then
    echo "Échec : mets uv à jour (uv self update), puis relance --fcc." >&2
    exit 1
  fi
  echo "Puis : fcc-server, ouvre son Admin UI sur cette machine, et colle ta clé OpenRouter."
  echo "Les robots Telegram et Discord restent éteints : voir docs/reprise.md, sécurité."
fi

echo
echo "Prêt. La suite :"
echo "  npm run nayos          le cockpit : agent, contrôles, serveur de dev, état"
echo "  docs/reprise.md        le guide complet"
