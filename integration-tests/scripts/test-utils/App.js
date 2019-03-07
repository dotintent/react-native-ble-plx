// @flow

import React from "react";
import { NativeModules } from "react-native";
import TestSuite from "./TestSuite";
import {BleManager} from "react-native-ble-plx";

export default class Diagnose extends React.Component<{}> {
  render() {
    return (
      <TestSuite
        testCases={[
          {
            name: "Initialize BleManager",
            run: () => {
              const unsupportedState = new Promise((resolve, reject) => {
                if (!BleManager) {
                  reject("BleManager is null!");
                }
                const manager: BleManager = new BleManager();
                manager.onStateChange(state => {
                  if (state === "Unsupported") {
                    resolve();
                  } else if (state !== "Unknown") {
                    reject("Unexpected state: " + state);
                  }
                }, true);
              });
              return unsupportedState;
            }
          }
        ]}
      />
    );
  }
}
