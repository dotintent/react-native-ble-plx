package com.polidea.reactnativeble.converter;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;
import com.polidea.rxandroidble.RxBleConnection;

class RxBleConnectionStateConverter implements Converter<RxBleConnection.RxBleConnectionState> {

    private interface Metadata {

        String STATE = "STATE";
    }

    interface State {

        String CONNECTING = "CONNECTING";
        String CONNECTED = "CONNECTED";
        String DISCONNECTED = "DISCONNECTED";
        String DISCONNECTING = "DISCONNECTING";
    }

    @Override
    public WritableMap convert(RxBleConnection.RxBleConnectionState rxBleConnectionState) {
        final WritableMap result = Arguments.createMap();
        result.putString(Metadata.STATE, connectionStateToString(rxBleConnectionState));
        return result;
    }

    String connectionStateToString(RxBleConnection.RxBleConnectionState rxBleConnectionState) {

        if (RxBleConnection.RxBleConnectionState.CONNECTING.equals(rxBleConnectionState)) {
            return State.CONNECTING;
        }
        if (RxBleConnection.RxBleConnectionState.CONNECTED.equals(rxBleConnectionState)) {
            return State.CONNECTED;
        }
        if (RxBleConnection.RxBleConnectionState.DISCONNECTED.equals(rxBleConnectionState)) {
            return State.DISCONNECTED;
        }
        if (RxBleConnection.RxBleConnectionState.DISCONNECTING.equals(rxBleConnectionState)) {
            return State.DISCONNECTING;
        }
        throw new UnsupportedOperationException("This method is not supported for " + rxBleConnectionState);
    }
}
