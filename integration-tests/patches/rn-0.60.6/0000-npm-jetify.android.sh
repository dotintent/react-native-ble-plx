#!/bin/bash

set -eo pipefail

PROJECT_NAME=$1

pushd $PROJECT_NAME
  npm install --save-dev jetifier
  npx jetify
popd