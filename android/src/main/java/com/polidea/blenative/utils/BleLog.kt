package com.polidea.blenative.utils

import android.support.annotation.IntDef
import android.util.Log
import java.util.regex.Pattern

/**
 * This file is a modification of Timber logging library -> https://github.com/JakeWharton/timber
 */
object BleLog {

    const val VERBOSE = Log.VERBOSE
    const val DEBUG = Log.DEBUG
    const val INFO = Log.INFO
    const val WARN = Log.WARN
    const val ERROR = Log.ERROR
    const val NONE = Integer.MAX_VALUE
    private val ANONYMOUS_CLASS = Pattern.compile("\\$\\d+$")
    private val NEXT_TAG = ThreadLocal<String>()

    private val logcatLogger: Logger = object : Logger {
        override fun log(level: Int, tag: String, msg: String) {
            Log.println(level, tag, msg)
        }
    }

    private var logLevel = Integer.MAX_VALUE

    private var logger = logcatLogger

    @IntDef(VERBOSE, DEBUG, INFO, WARN, ERROR, NONE)
    @Retention(AnnotationRetention.SOURCE)
    annotation class LogLevel

    /**
     * Simple logging interface for log messages from RxAndroidBle
     *
     * @see .setLogger
     */
    interface Logger {

        /**
         * @param level one of [Log.VERBOSE], [Log.DEBUG],[Log.INFO],
         * [Log.WARN],[Log.ERROR]
         * @param tag   log tag, caller
         * @param msg   message to log
         */
        fun log(level: Int, tag: String, msg: String)
    }

    /**
     * Set a custom logger implementation, set it to `null` to use default logcat logging
     *
     * Example how to forward logs to Timber:<br></br>
     *
     * `
     * <pre>
     * BleLog.setLogger(new BleLog.Logger() {
     * &#64;Override
     * public void log(final int level, final String tag, final String msg) {
     * Timber.tag(tag).log(level, msg);
     * }
     * });
    </pre> *
    ` *
     */
    fun setLogger(logger: Logger?) {
        if (logger == null) {
            this.logger = logcatLogger
        } else {
            this.logger = logger
        }
    }

    fun setLogLevel(@LogLevel logLevel: Int) {
        this.logLevel = logLevel
    }

    @LogLevel fun getLogLevel(): Int {
        return logLevel
    }

    private fun createTag(): String {
        var tag: String? = NEXT_TAG.get()
        if (tag != null) {
            NEXT_TAG.remove()
            return tag
        }

        val stackTrace = Throwable().stackTrace
        if (stackTrace.size < 5) {
            throw IllegalStateException(
                    "Synthetic stacktrace didn't have enough elements: are you using proguard?")
        }
        tag = stackTrace[4].className
        val m = ANONYMOUS_CLASS.matcher(tag!!)
        if (m.find()) {
            tag = m.replaceAll("")
        }
        tag = tag!!.replace("Impl", "")
        tag = tag.replace("RxBle", "")
        return "RxBle#" + tag.substring(tag.lastIndexOf('.') + 1)
    }

    private fun formatString(message: String, vararg args: Any): String? {
        // If no varargs are supplied, treat it as a request to log the string without formatting.
        return if (args.size == 0) message else String.format(message, *args)
    }

    fun v(message: String, vararg args: Any) {
        throwShade(Log.VERBOSE, null, message, *args)
    }

    fun v(t: Throwable, message: String, vararg args: Any) {
        throwShade(Log.VERBOSE, t, message, *args)
    }

    fun d(message: String, vararg args: Any) {
        throwShade(Log.DEBUG, null, message, *args)
    }

    fun d(t: Throwable, message: String, vararg args: Any) {
        throwShade(Log.DEBUG, t, message, *args)
    }

    fun i(message: String, vararg args: Any) {
        throwShade(Log.INFO, null, message, *args)
    }

    fun i(t: Throwable, message: String, vararg args: Any) {
        throwShade(Log.INFO, t, message, *args)
    }

    fun w(message: String, vararg args: Any) {
        throwShade(Log.WARN, null, message, *args)
    }

    fun w(t: Throwable, message: String, vararg args: Any) {
        throwShade(Log.WARN, t, message, *args)
    }

    fun e(message: String, vararg args: Any) {
        throwShade(Log.ERROR, null, message, *args)
    }

    fun e(t: Throwable, message: String, vararg args: Any) {
        throwShade(Log.ERROR, t, message, *args)
    }

    private fun throwShade(priority: Int, t: Throwable?, message: String, vararg args: Any) {
        if (priority < logLevel) {
            return
        }

        val formattedMessage = formatString(message, *args)
        val finalMessage: String

        if (formattedMessage == null || formattedMessage.length == 0) {
            if (t != null) {
                finalMessage = Log.getStackTraceString(t)
            } else {
                // Swallow message if it's null and there's no throwable.
                return
            }
        } else if (t != null) {
            finalMessage = formattedMessage + "\n" + Log.getStackTraceString(t)
        } else {
            finalMessage = formattedMessage
        }

        val tag = createTag()
        println(priority, tag, finalMessage)
    }

    private fun println(priority: Int, tag: String, message: String) {
        if (message.length < 4000) {
            logger.log(priority, tag, message)
        } else {
            // It's rare that the message will be this large, so we're ok with the perf hit of splitting
            // and calling Log.println N times.  It's possible but unlikely that a single line will be
            // longer than 4000 characters: we're explicitly ignoring this case here.
            val lines = message.split("\n".toRegex()).dropLastWhile { it.isEmpty() }.toTypedArray()
            for (line in lines) {
                logger.log(priority, tag, line)
            }
        }
    }

    fun isAtLeast(expectedLogLevel: Int): Boolean {
        return logLevel <= expectedLogLevel
    }
}
