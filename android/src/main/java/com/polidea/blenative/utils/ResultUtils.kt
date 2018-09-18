package com.polidea.blenative.utils

import com.polidea.blenative.centralmanager.Result

enum class ResultKey(val value: Int) {
    DATA(0),
    ERROR(1)
}

object ResultUtils {

    fun createSuccessResult(data: Any?): Result = mapOf(Pair(ResultKey.DATA.value, data))

    fun createErrorResult(error: Any): Result = mapOf(Pair(ResultKey.ERROR.value, error))
}