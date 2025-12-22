// @flow

declare module 'react-native' {
  declare export var Platform: {
    OS: 'ios' | 'android' | 'web',
    Version: number | string,
    select: <T>(options: { ios?: T, android?: T, web?: T, default?: T }) => T,
    ...
  };

  declare export var NativeModules: { [key: string]: any };
  
  declare export type EmitterSubscription = {
    remove: () => void,
    ...
  };
  
  declare export class NativeEventEmitter {
    constructor(nativeModule?: any): void;
    addListener(eventType: string, listener: (...args: any[]) => void): EmitterSubscription;
    removeAllListeners(eventType: string): void;
    removeSubscription(subscription: EmitterSubscription): void;
  }
}

