package com.polidea.reactnativeble.utils

import com.polidea.reactnativeble.mock.MockReadableArray
import org.junit.Assert.assertArrayEquals
import org.junit.Test

class ReadableArrayConverterTest {

    @Test
    fun `GIVEN empty ReadableArray WHEN toStringArray THEN empty String array is returned`() {
        // given
        val input = MockReadableArray()
        val expected = arrayOf<String>()

        // when
        val obtained = ReadableArrayConverter.toStringArray(input)

        // then
        assertArrayEquals(expected, obtained)
    }

    @Test
    fun `GIVEN ReadableArray with String elements WHEN toStringArray THEN array of Strings is returned`() {
        // given
        val expected = arrayOf("foo", "bar", "baz")
        val input = MockReadableArray(*expected)

        // when
        val obtained = ReadableArrayConverter.toStringArray(input)

        // then
        assertArrayEquals(expected, obtained)
    }
}

