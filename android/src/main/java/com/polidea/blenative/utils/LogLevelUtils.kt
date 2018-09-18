package com.polidea.blenative.utils

object LogLevelUtils {

    private const val NONE = "None"
    private const val VERBOSE = "Verbose"
    private const val DEBUG = "Debug"
    private const val INFO = "Info"
    private const val WARNING = "Warning"
    private const val ERROR = "Error"

    @BleLog.LogLevel
    fun fromLevelString(levelString: String): Int {
        return when (levelString) {
            NONE -> BleLog.NONE
            VERBOSE -> BleLog.VERBOSE
            DEBUG -> BleLog.DEBUG
            INFO -> BleLog.INFO
            WARNING -> BleLog.WARN
            ERROR -> BleLog.ERROR
            else -> throw IllegalArgumentException("Could not create log level for string: $levelString")
        }
    }

    fun levelDescription(@BleLog.LogLevel level: Int): String {
        return when(level) {
            BleLog.NONE -> NONE
            BleLog.VERBOSE -> VERBOSE
            BleLog.DEBUG -> DEBUG
            BleLog.INFO -> INFO
            BleLog.WARN -> WARNING
            BleLog.ERROR -> ERROR
            else -> throw IllegalArgumentException("Could not create description for log level: $level")
        }
    }

}