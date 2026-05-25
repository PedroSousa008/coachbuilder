#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export GIT_SSH_COMMAND="ssh -i ${HOME}/.ssh/id_ed25519_coachbuilder_deploy -o IdentitiesOnly=yes"
git remote set-url origin git@github.com:PedroSousa008/coachbuilder.git
git push origin main
echo "Push OK — a Vercel deve iniciar deploy em breve."
