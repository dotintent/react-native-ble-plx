package com.polidea.blenative

import java.util.*

enum class CancelOptionKeys(val value: String) {
    PROMISE_ID("promiseId"),
    TIMEOUT("timeout"),
    IGNORE_CANCELLED("ignoreCancelled")
}

enum class BufferActionKeys(val value: String) {
    STRATEGY("strategy"),
    PLACEMENT("placement"),
    CHUNK_SIZE("chunkSize")
}

enum class BufferActionStrategy(val value: String) {
    TAKE("take"),
    PEEK("peek");

    companion object {
        fun forValue(value: String?) = values().find { it.value == value }
    }
}

enum class BufferActionPlacement(val value: String) {
    LATEST("latest"),
    OLDEST("oldest");

    companion object {
        fun forValue(value: String?) = values().find { it.value == value }
    }
}

enum class MonitorStateOptionKeys(val value: String) {
    EMIT_CURRENT_STATE("emitCurrentState")
}

enum class ConnectDeviceOptionKeys(val value: String) {
    AUTO_CONNECT("autoConnect")
}

object Constants {
    const val MINIMUM_MTU: Int = 23
    val CHARACTERISTIC_UPDATE_NOTIFICATION_DESCRIPTOR = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")!!

    object CentralAction {
        const val CONNECT_TO_PERIPHERAL = 1
        const val DISCONNECT = 2
        const val DISCOVER_SERVICES = 3
        const val READ_REMOTE_RSSI = 4
        const val REQUEST_MTU = 5
        const val READ_CHARACTERISTIC = 6
        const val WRITE_CHARACTERISTIC = 7
        const val SET_NOTIFICATION_ENABLED = 8
    }

    object PeripheralCallback {
        const val ON_READ_REMOTE_RSSI = 100
        const val ON_CHARACTERISTIC_READ = 101
        const val ON_CHARACTERISTIC_WRITE = 102
        const val ON_SERVICES_DISCOVERED = 103
        const val ON_MTU_CHANGED = 104
        const val ON_DESCRIPTOR_WRITE = 105
        const val ON_CHARACTERISTIC_CHANGED = 106
        const val ON_CONNECTION_STATE_CHANGE = 107
    }
}