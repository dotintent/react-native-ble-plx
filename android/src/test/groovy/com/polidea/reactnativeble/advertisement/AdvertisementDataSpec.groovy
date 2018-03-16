package com.polidea.reactnativeble.advertisement

import spock.lang.Specification

class AdvertisementDataSpec extends Specification {

    public static byte[] _(String s) {
        int len = s.length();
        byte[] data = new byte[len / 2];
        for (int i = 0; i < len; i += 2) {
            data[i / 2] = (byte) ((Character.digit(s.charAt(i),   16) << 4)
                                 + Character.digit(s.charAt(i+1), 16));
        }
        return data;
    }

    def "solicited service UUIDs should be parsed properly"(String advData, String[] uuids) {
        when:
        def data = AdvertisementData.parseScanResponseData(_(advData))
        def ssUUIDs = uuids == null ? null : uuids.collect { UUID.fromString(it) }

        then:
        data.solicitedServiceUUIDs == ssUUIDs

        where:
        advData                                | uuids
        "03140a18"                             | ["0000180a-0000-1000-8000-00805f9b34fb"]
        "03140a180b28"                         | ["0000180a-0000-1000-8000-00805f9b34fb"]
        "05140a180b28"                         | ["0000180a-0000-1000-8000-00805f9b34fb", "0000280b-0000-1000-8000-00805f9b34fb"]
        "05140a180b28ff"                       | ["0000180a-0000-1000-8000-00805f9b34fb", "0000280b-0000-1000-8000-00805f9b34fb"]
        "051f0a180b28"                         | ["280b180a-0000-1000-8000-00805f9b34fb"]
        "1115ba5689a6fabfa2bd01467d6eca36abad" | ["adab36ca-6e7d-4601-bda2-bffaa68956ba"]
        "0114"                                 | []
    }

    def "service UUIDs should be parsed properly"(String advData, String[] uuids) {
        when:
        def data = AdvertisementData.parseScanResponseData(_(advData))
        def sUUIDs = uuids == null ? null : uuids.collect { UUID.fromString(it) }

        then:
        data.serviceUUIDs == sUUIDs

        where:
        advData                                | uuids
        "03020a18"                             | ["0000180a-0000-1000-8000-00805f9b34fb"]
        "03030a18"                             | ["0000180a-0000-1000-8000-00805f9b34fb"]
        "03020a180b28"                         | ["0000180a-0000-1000-8000-00805f9b34fb"]
        "05030a180b28"                         | ["0000180a-0000-1000-8000-00805f9b34fb", "0000280b-0000-1000-8000-00805f9b34fb"]
        "05030a180b28ff"                       | ["0000180a-0000-1000-8000-00805f9b34fb", "0000280b-0000-1000-8000-00805f9b34fb"]
        "05040a180b28"                         | ["280b180a-0000-1000-8000-00805f9b34fb"]
        "05050a180b28"                         | ["280b180a-0000-1000-8000-00805f9b34fb"]
        "1106ba5689a6fabfa2bd01467d6eca36abad" | ["adab36ca-6e7d-4601-bda2-bffaa68956ba"]
        "1106ba5689a6fabfa2bd01467d6eca36abad" | ["adab36ca-6e7d-4601-bda2-bffaa68956ba"]
        "0106"                                 | []
    }

    def "service data should be parsed properly"(String advData, Map<String, byte[]> serviceData) {
        when:
        def data = AdvertisementData.parseScanResponseData(_(advData))
        def sData = serviceData == null ? null : serviceData.collectEntries { key, value -> [UUID.fromString(key), value] }

        then:
        data.serviceData == sData

        where:
        advData                                  | serviceData
        "0116"                                   | null
        "0216ff"                                 | null
        "05160a180704"                           | ["0000180a-0000-1000-8000-00805f9b34fb": _("0704")]
        "05160a180704ffaa"                       | ["0000180a-0000-1000-8000-00805f9b34fb": _("0704")]
        "03160a18"                               | ["0000180a-0000-1000-8000-00805f9b34fb": _("")]
        "05160a180b2805160a190704ff"             | ["0000180a-0000-1000-8000-00805f9b34fb": _("0b28"), "0000190a-0000-1000-8000-00805f9b34fb": _("0704")]
        "05160a180b2806160a190704ff"             | ["0000180a-0000-1000-8000-00805f9b34fb": _("0b28"), "0000190a-0000-1000-8000-00805f9b34fb": _("0704ff")]
        "05200a180b28"                           | ["280b180a-0000-1000-8000-00805f9b34fb": _("")]
        "08200a180b28beefee"                     | ["280b180a-0000-1000-8000-00805f9b34fb": _("beefee")]
        "1121ba5689a6fabfa2bd01467d6eca36abad"   | ["adab36ca-6e7d-4601-bda2-bffaa68956ba": _("")]
        "1221ba5689a6fabfa2bd01467d6eca36abad69" | ["adab36ca-6e7d-4601-bda2-bffaa68956ba": _("69")]
    }

    def "power tx level advertisement data should be parsed properly"(String advData, Integer value) {
        when:
        def data = AdvertisementData.parseScanResponseData(_(advData))

        then:
        value == data.txPowerLevel

        where:
        advData    | value
        "020aff"   | -1
        "020a81"   | -127
        "020a7f"   | 127
        "020a08"   | 8
        "030a08ff" | null
        "010a"     | null
    }

    def "manufacturer data should be parsed properly"(String advData, byte[] manuData) {
        when:
        def data = AdvertisementData.parseScanResponseData(_(advData))

        then:
        manuData == data.manufacturerData

        where:
        advData         | manuData
        "01ff"          | null
        "02ffaa"        | null
        "03ff0102"      | _("0102")
        "05ff01020304"  | _("01020304")
        "04ff01020304"  | _("010203")
    }

    def "local name should be parsed properly, preferring complete name over short name"(String advData, String localName) {
        when:
        def data = AdvertisementData.parseScanResponseData(_(advData))

        then:
        localName == data.localName

        where:
        advData                   | localName
        "051073C3B36C"            | null
        "040873C3B3"              | "só"
        "050973C3B36C"            | "sól"
        "040873C3B3050973C3B36C"  | "sól"
        "050973C3B36C040873C3B3"  | "sól"
    }

    def "complex advertisement data should be parsed properly"() {
        when:
        def data = AdvertisementData.parseScanResponseData(_("03160a180909536f6d654e616d65020a7f05140a180b28"))

        then:
        data.localName == "SomeName"
        data.txPowerLevel == 127
        data.solicitedServiceUUIDs == [UUID.fromString("0000180a-0000-1000-8000-00805f9b34fb"), UUID.fromString("0000280b-0000-1000-8000-00805f9b34fb")]
        data.serviceData == [(UUID.fromString("0000180a-0000-1000-8000-00805f9b34fb")): _("")]
    }

    def "unknown advertisement data should be skipped"() {
        when:
        def data = AdvertisementData.parseScanResponseData(_("03160a1803fe01020909536f6d654e616d65020a7f05140a180b28"))
        then:
        data.localName == "SomeName"
        data.txPowerLevel == 127
        data.solicitedServiceUUIDs == [UUID.fromString("0000180a-0000-1000-8000-00805f9b34fb"), UUID.fromString("0000280b-0000-1000-8000-00805f9b34fb")]
        data.serviceData == [(UUID.fromString("0000180a-0000-1000-8000-00805f9b34fb")): _("")]
    }

    def "corrupted advertisement data should be ignored"() {
        when:
        def data = AdvertisementData.parseScanResponseData(_("03160a180909536f6d654e616d65020a7f05140a180b28ff223210"))

        then:
        data.localName == "SomeName"
        data.txPowerLevel == 127
        data.solicitedServiceUUIDs == [UUID.fromString("0000180a-0000-1000-8000-00805f9b34fb"), UUID.fromString("0000280b-0000-1000-8000-00805f9b34fb")]
        data.serviceData == [(UUID.fromString("0000180a-0000-1000-8000-00805f9b34fb")): _("")]
    }

    def "corrupted advertisement with 0 length AD data should be ignored"() {
        when:
        def data = AdvertisementData.parseScanResponseData(_("000aff00"))

        then:
        data.txPowerLevel == null
    }
}