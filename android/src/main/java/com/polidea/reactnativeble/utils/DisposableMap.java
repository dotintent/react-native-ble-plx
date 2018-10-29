package com.polidea.reactnativeble.utils;

import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

import rx.Subscription;

public class DisposableMap {

    final private Map<String, Subscription> subscriptions = new HashMap<>();

    public synchronized void replaceSubscription(String key, Subscription subscription) {
        Subscription oldSubscription = subscriptions.put(key, subscription);
        if (oldSubscription != null && !oldSubscription.isUnsubscribed()) {
            oldSubscription.unsubscribe();
        }
    }

    public synchronized boolean removeSubscription(String key) {
        Subscription subscription = subscriptions.remove(key);
        if (subscription == null) return false;
        if (!subscription.isUnsubscribed()) {
            subscription.unsubscribe();
        }
        return true;
    }

    public synchronized void removeAllSubscriptions() {
        Iterator<Map.Entry<String, Subscription>> it = subscriptions.entrySet().iterator();
        while (it.hasNext()) {
            Subscription subscription = it.next().getValue();
            it.remove();
            if (!subscription.isUnsubscribed()) {
                subscription.unsubscribe();
            }
        }
    }
}
