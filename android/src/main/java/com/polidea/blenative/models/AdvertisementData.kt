package com.polidea.blenative.models

import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.charset.Charset
import java.util.*
import kotlin.collections.HashMap

class AdvertisementData {

    var manufacturerData: ByteArray? = null
        private set
    var serviceData: MutableMap<UUID, ByteArray>? = null
        private set
    var serviceUUIDs: ArrayList<UUID>? = null
        private set
    var localName: String? = null
        private set
    var txPowerLevel: Int? = null
        private set
    var solicitedServiceUUIDs: ArrayList<UUID>? = null
        private set

    companion object {

        private const val BLUETOOTH_BASE_UUID_LSB = -0x7fffff7fa064cb05L
        private const val BLUETOOTH_BASE_UUID_MSB = 0x00001000

        fun parseScanResponseData(advertisement: ByteArray): AdvertisementData {
            val advData = AdvertisementData()
            val rawData = ByteBuffer.wrap(advertisement).order(ByteOrder.LITTLE_ENDIAN)
            while (rawData.remaining() >= 2) {
                var adLength = rawData.get().toInt() and 0xFF
                if (adLength == 0) break
                adLength -= 1
                val adType = rawData.get().toInt() and 0xFF
                if (rawData.remaining() < adLength) break
                parseAdvertisementData(advData, adType, adLength, rawData.slice().order(ByteOrder.LITTLE_ENDIAN))
                rawData.position(rawData.position() + adLength)
            }
            return advData
        }

        private fun parseAdvertisementData(advData: AdvertisementData, adType: Int, adLength: Int, data: ByteBuffer) {
            when (adType) {
                0xFF -> parseManufacturerData(advData, adLength, data)

                0x02, 0x03 -> parseServiceUUIDs(advData, adLength, data, 2)
                0x04, 0x05 -> parseServiceUUIDs(advData, adLength, data, 4)
                0x06, 0x07 -> parseServiceUUIDs(advData, adLength, data, 16)

                0x08, 0x09 -> parseLocalName(advData, adType, adLength, data)

                0x0A -> parseTxPowerLevel(advData, adLength, data)

                0x14 -> parseSolicitedServiceUUIDs(advData, adLength, data, 2)
                0x1F -> parseSolicitedServiceUUIDs(advData, adLength, data, 4)
                0x15 -> parseSolicitedServiceUUIDs(advData, adLength, data, 16)

                0x16 -> parseServiceData(advData, adLength, data, 2)
                0x20 -> parseServiceData(advData, adLength, data, 4)
                0x21 -> parseServiceData(advData, adLength, data, 16)
            }
        }

        private fun parseLocalName(advData: AdvertisementData, adType: Int, adLength: Int, data: ByteBuffer) {
            // Complete local name is preferred over short local name.
            if (advData.localName == null || adType == 0x09) {
                val bytes = ByteArray(adLength)
                data.get(bytes, 0, adLength)
                advData.localName = String(bytes, Charset.forName("UTF-8"))
            }
        }

        private fun parseUUID(data: ByteBuffer, uuidLength: Int): UUID? {
            val lsb: Long
            val msb: Long
            when (uuidLength) {
                2 -> {
                    msb = (data.short.toLong() and 0xFFFF shl 32) + BLUETOOTH_BASE_UUID_MSB
                    lsb = BLUETOOTH_BASE_UUID_LSB
                }
                4 -> {
                    msb = (data.int.toLong() shl 32) + BLUETOOTH_BASE_UUID_MSB
                    lsb = BLUETOOTH_BASE_UUID_LSB
                }
                16 -> {
                    lsb = data.long
                    msb = data.long
                }
                else -> {
                    data.position(data.position() + uuidLength)
                    return null
                }
            }
            return UUID(msb, lsb)
        }

        private fun parseSolicitedServiceUUIDs(advData: AdvertisementData, adLength: Int, data: ByteBuffer, uuidLength: Int) {
            if (advData.solicitedServiceUUIDs == null) advData.solicitedServiceUUIDs = ArrayList()
            while (data.remaining() >= uuidLength && data.position() < adLength) {
                val element = parseUUID(data, uuidLength)
                element?.let {
                    advData.solicitedServiceUUIDs?.add(it)
                }
            }
        }

        private fun parseServiceUUIDs(advData: AdvertisementData, adLength: Int, data: ByteBuffer, uuidLength: Int) {
            if (advData.serviceUUIDs == null) advData.serviceUUIDs = ArrayList()
            while (data.remaining() >= uuidLength && data.position() < adLength) {
                val element = parseUUID(data, uuidLength)
                element?.let {
                    advData.serviceUUIDs?.add(it)
                }
            }
        }

        private fun parseServiceData(advData: AdvertisementData, adLength: Int, data: ByteBuffer, uuidLength: Int) {
            if (adLength < uuidLength) return
            val serviceDataMap = advData.serviceData ?: HashMap()
            val serviceUUID = parseUUID(data, uuidLength)
            val serviceDataLength = adLength - uuidLength
            val serviceData = ByteArray(serviceDataLength)
            data.get(serviceData, 0, serviceDataLength)
            if (serviceUUID != null) {
                serviceDataMap[serviceUUID] = serviceData
            }
            advData.serviceData = serviceDataMap
        }

        private fun parseTxPowerLevel(advData: AdvertisementData, adLength: Int, data: ByteBuffer) {
            if (adLength != 1) return
            advData.txPowerLevel = data.get().toInt()
        }

        private fun parseManufacturerData(advData: AdvertisementData, adLength: Int, data: ByteBuffer) {
            if (adLength < 2) return
            advData.manufacturerData = ByteArray(adLength)
            data.get(advData.manufacturerData!!, 0, adLength)
        }
    }
}