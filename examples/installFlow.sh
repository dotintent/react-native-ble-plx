#!/bin/bash

FLOW_VERSION=$(cat .flowconfig| grep -A 1 '\[version\]' | tail -1)

npm install flow-bin@$FLOW_VERSION