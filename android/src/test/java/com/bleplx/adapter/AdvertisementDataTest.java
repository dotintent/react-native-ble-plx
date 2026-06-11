package com.bleplx.adapter;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import org.junit.Test;

public class AdvertisementDataTest {

  // --- helpers -------------------------------------------------------------

  private static byte[] mfgStructure(byte... payload) {
    byte[] structure = new byte[payload.length + 2];
    structure[0] = (byte) (payload.length + 1); // AD length includes the type byte
    structure[1] = (byte) 0xFF;                 // manufacturer specific data
    System.arraycopy(payload, 0, structure, 2, payload.length);
    return structure;
  }

  private static byte[] concat(byte[]... parts) {
    int length = 0;
    for (byte[] part : parts) length += part.length;
    byte[] record = new byte[length];
    int offset = 0;
    for (byte[] part : parts) {
      System.arraycopy(part, 0, record, offset, part.length);
      offset += part.length;
    }
    return record;
  }

  private static final byte[] LOCAL_NAME_TEST = {0x05, 0x09, 'T', 'e', 's', 't'};

  private static final byte[] LONG_PAYLOAD = {0x64, 0x4E, 0x01, 0x02};
  private static final byte[] SHORT_PAYLOAD = {0x46, 0x46};

  // --- single structure: behaviour unchanged --------------------------------

  @Test
  public void parsesSingleManufacturerDataStructure() {
    AdvertisementData advData =
      AdvertisementData.parseScanResponseData(mfgStructure(LONG_PAYLOAD));

    assertArrayEquals(LONG_PAYLOAD, advData.getManufacturerData());
  }

  @Test
  public void ignoresManufacturerDataShorterThanCompanyId() {
    AdvertisementData advData =
      AdvertisementData.parseScanResponseData(mfgStructure((byte) 0x64));

    assertNull(advData.getManufacturerData());
  }

  // --- multiple structures: the longest one wins ----------------------------

  @Test
  public void keepsLongerManufacturerDataWhenShorterFollows() {
    // e.g. real payload advertised in ADV_IND, placeholder in SCAN_RSP
    byte[] record = concat(mfgStructure(LONG_PAYLOAD), mfgStructure(SHORT_PAYLOAD));

    AdvertisementData advData = AdvertisementData.parseScanResponseData(record);

    assertArrayEquals(LONG_PAYLOAD, advData.getManufacturerData());
  }

  @Test
  public void keepsLongerManufacturerDataWhenLongerFollows() {
    // e.g. placeholder advertised in ADV_IND, real payload in SCAN_RSP
    byte[] record = concat(mfgStructure(SHORT_PAYLOAD), mfgStructure(LONG_PAYLOAD));

    AdvertisementData advData = AdvertisementData.parseScanResponseData(record);

    assertArrayEquals(LONG_PAYLOAD, advData.getManufacturerData());
  }

  @Test
  public void keepsFirstManufacturerDataOnEqualLength() {
    byte[] first = {0x01, 0x02, 0x03};
    byte[] second = {0x04, 0x05, 0x06};
    byte[] record = concat(mfgStructure(first), mfgStructure(second));

    AdvertisementData advData = AdvertisementData.parseScanResponseData(record);

    assertArrayEquals(first, advData.getManufacturerData());
  }

  @Test
  public void continuesParsingSubsequentStructuresAfterKeepingExisting() {
    // a kept-as-is (ignored) shorter structure must not desynchronize the
    // cursor: the local name that follows it still has to parse correctly
    byte[] record =
      concat(mfgStructure(LONG_PAYLOAD), mfgStructure(SHORT_PAYLOAD), LOCAL_NAME_TEST);

    AdvertisementData advData = AdvertisementData.parseScanResponseData(record);

    assertArrayEquals(LONG_PAYLOAD, advData.getManufacturerData());
    assertEquals("Test", advData.getLocalName());
  }

  // --- real-world capture ----------------------------------------------------

  @Test
  public void parsesRealWorldMergedScanRecord() {
    // Merged scan record captured from a peripheral that advertises its real
    // 25-byte identity in one packet and a 12-byte "FFFFFFFFFFFF" placeholder
    // in the other (see PR description). Previously the placeholder won.
    byte[] record = {
      0x02, 0x01, 0x06, 0x1A, (byte) 0xFF, 0x64, 0x4E, 0x43,
      0x50, 0x64, 0x53, 0x67, 0x6D, 0x52, 0x50, 0x35,
      0x30, 0x31, 0x30, 0x31, 0x30, 0x35, 0x39, 0x30,
      0x30, 0x31, 0x31, 0x38, 0x39, 0x01, 0x0D, (byte) 0xFF,
      0x46, 0x46, 0x46, 0x46, 0x46, 0x46, 0x46, 0x46,
      0x46, 0x46, 0x46, 0x46, 0x0D, 0x09, 0x41, 0x49,
      0x20, 0x4E, 0x6F, 0x74, 0x65, 0x2D, 0x34, 0x45,
      0x36, 0x33, 0x00, 0x00, 0x00, 0x00
    };
    byte[] realPayload = {
      0x64, 0x4E, 0x43, 0x50, 0x64, 0x53, 0x67, 0x6D, 0x52, 0x50, 0x35, 0x30,
      0x31, 0x30, 0x31, 0x30, 0x35, 0x39, 0x30, 0x30, 0x31, 0x31, 0x38, 0x39,
      0x01
    };

    AdvertisementData advData = AdvertisementData.parseScanResponseData(record);

    assertArrayEquals(realPayload, advData.getManufacturerData());
    assertEquals("AI Note-4E63", advData.getLocalName());
  }
}
