#!/usr/bin/env bash
# Run by GitHub Actions with its component-specific restricted SSH key.
set -Eeuo pipefail
umask 077
: "${LIGHTSAIL_DEPLOY_KEY:?Missing production deployment key}"
: "${GITHUB_SHA:?Missing commit SHA}"
: "${RUNNER_TEMP:?Missing runner temporary directory}"
archive="${1:?Pass the tested Docker image archive}"
[[ "$GITHUB_SHA" =~ ^[0-9a-f]{40}$ ]]
ssh_dir=$(mktemp -d "$RUNNER_TEMP/kostay-ssh.XXXXXX")
trap 'rm -rf -- "$ssh_dir"' EXIT
printf '%s\n' "$LIGHTSAIL_DEPLOY_KEY" > "$ssh_dir/key"
# Verified against the Lightsail browser SSH console before initial deployment.
printf '%s\n' '52.62.244.121 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILcmhN2+DrWuSTCM/bAtvWo4Oyapxr1nNOj3how2NnJB' > "$ssh_dir/known_hosts"
ssh -T -i "$ssh_dir/key" \
  -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes \
  -o "UserKnownHostsFile=$ssh_dir/known_hosts" -o HostKeyAlgorithms=ssh-ed25519 \
  -o ConnectTimeout=20 -o ServerAliveInterval=15 -o ServerAliveCountMax=4 \
  ubuntu@52.62.244.121 "$GITHUB_SHA" < "$archive"
