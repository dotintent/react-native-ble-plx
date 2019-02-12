#!/bin/bash

FLOW_VERSION=$(cat .flowconfig| grep -A 1 '\[version\]' | tail -1)

yarn add flow-bin@$FLOW_VERSION