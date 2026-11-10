#!/bin/bash

# PRODUCTION
git reset --hard
git checkout main
git pull origin main

# Build the new image while the old container keeps running,
# then swap to it (a few seconds of downtime)
docker compose up -d --build

# Remove old unused images to free disk space
docker image prune -f