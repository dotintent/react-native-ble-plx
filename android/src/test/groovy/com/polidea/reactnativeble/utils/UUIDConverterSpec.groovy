package com.polidea.reactnativeble.utils

import spock.lang.Specification

class UUIDConverterSpec extends Specification {
    def "UUID strings should be converted properly to UUID object"(String shortUUID, String uuid) {
        when:
        def upperCaseUUID = UUIDConverter.convert(shortUUID.toUpperCase())
        def lowerCaseUUID = UUIDConverter.convert(shortUUID.toLowerCase())
        def mixedCaseUUID = UUIDConverter.convert(shortUUID)
        def baseUUID = UUID.fromString(uuid)

        then:
        baseUUID == upperCaseUUID
        baseUUID == lowerCaseUUID
        baseUUID == mixedCaseUUID

        where:
        shortUUID                              | uuid
        "180A"                                 | "0000180a-0000-1000-8000-00805f9b34fb"
        "280b180A"                             | "280b180a-0000-1000-8000-00805f9b34fb"
        "55d2EA0c-99c3-11e6-9F33-a24fc0d9649c" | "55d2ea0c-99c3-11e6-9f33-a24fc0d9649c"
    }

    def "UUID array of strings should be converted properly to array of UUID objects"() {
        when:
        def uuids = UUIDConverter.convert("180A", "280b180A", "55d2EA0c-99c3-11e6-9F33-a24fc0d9649c")
        UUID[] refUUIDs = [UUID.fromString("0000180a-0000-1000-8000-00805f9b34fb"),
                           UUID.fromString("280b180a-0000-1000-8000-00805f9b34fb"),
                           UUID.fromString("55d2ea0c-99c3-11e6-9f33-a24fc0d9649c")]

        then:
        Arrays.equals(uuids, refUUIDs)
    }

    def "fromUUID always returns full lowercase UUID"(String uuid) {
        when:
        def refUUID = UUIDConverter.fromUUID(UUID.fromString(uuid))

        then:
        uuid == refUUID

        where:
        uuid                                   | _
        "0000180a-0000-1000-8000-00805f9b34fb" | _
        "280b180a-0000-1000-8000-00805f9b34fb" | _
        "55d2ea0c-99c3-11e6-9f33-a24fc0d9649c" | _
    }
}