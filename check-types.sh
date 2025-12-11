#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
cd /mnt/c/Users/zergu/repos/footpath-backend-monolith
npx tsc --noEmit
