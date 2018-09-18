package com.polidea.blenative.handlers

import com.polidea.blenative.models.Request
import com.polidea.blenative.models.RequestType
import com.polidea.blenative.task.TaskDispatcher

data class RequestTimeout(val timeout: Int, val onTimeout: (Request) -> Void)

class RequestHandler(private val taskDispatcher: TaskDispatcher) {

    private val requests = mutableListOf<Request>()

    private val timeoutRunnablesToRequest = mutableMapOf<Request, Runnable>()

    fun addRequest(request: Request, timeout: RequestTimeout?) {
        requests.add(request)
        timeout?.let {
            addTimeout(timeout.timeout, request, timeout.onTimeout)
        }
    }

    fun removeRequest(promiseId: String): Request? {
        val index = requests.indexOfFirst { it.promiseId == promiseId }
        return if (index == -1) {
            null
        } else {
            removeRequest(index)
        }
    }

    fun removeRequest(relatedIdentifier: Int, type: RequestType): Request? {
        val index = requests.indexOfFirst { it.relatedIdentifier == relatedIdentifier && it.type == type }
        if (index == -1) {
            return null
        }
        return removeRequest(index)
    }

    fun removeRequest(request: Request): Request? {
        val index = requests.indexOf(request)
        if (index == -1) {
            return null
        }
        return removeRequest(index)
    }

    private fun removeRequest(index: Int): Request? {
        val request = requests.removeAt(index)
        val timeoutRunnable = timeoutRunnablesToRequest.remove(request)
        timeoutRunnable?.let {
            taskDispatcher.removeCallbacks(it)
        }
        return request

    }

    fun findRequest(relatedIdentifier: Int, type: RequestType): Request? {
        return requests.first { it.relatedIdentifier == relatedIdentifier && it.type == type }
    }

    private fun addTimeout(timeout: Int, request: Request, onTimeout: (Request) -> Void) {
        val runnable = Runnable {
            removeRequest(request)
            onTimeout(request)
        }
        timeoutRunnablesToRequest[request] = runnable

        taskDispatcher.postDelayed(runnable, (timeout * 1000).toLong())
    }
}