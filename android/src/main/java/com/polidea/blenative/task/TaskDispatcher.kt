package com.polidea.blenative.task

interface TaskDispatcher {
    fun postDelayed(runnable: Runnable, delay: Long)
    fun removeCallbacks(runnable: Runnable)
}