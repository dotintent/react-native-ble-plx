package com.polidea.reactnativeble;


enum RefreshGattMoment {

    ON_CONNECTED("OnConnected");

    private final String javaScriptName;

    RefreshGattMoment(String javaScriptName) {
        this.javaScriptName = javaScriptName;
    }

    static RefreshGattMoment byJavaScriptName(String javaScriptName) {
        for (RefreshGattMoment refreshGattMoment : RefreshGattMoment.values()) {
            if (refreshGattMoment.javaScriptName.equals(javaScriptName)) return refreshGattMoment;
        }
        return null;
    }
}
