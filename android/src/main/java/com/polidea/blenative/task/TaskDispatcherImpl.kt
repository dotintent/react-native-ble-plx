package com.polidea.blenative.task

import android.os.Handler

class TaskDispatcherImpl(private val handler: Handler) : TaskDispatcher {
    override fun removeCallbacks(runnable: Runnable) {
        handler.removeCallbacks(runnable)
    }

    override fun postDelayed(runnable: Runnable, delay: Long) {
        handler.postDelayed(runnable, delay)
    }
}