package com.bleplx.adapter.utils.mapper;

import com.bleplx.adapter.AdvertisementData;
import com.bleplx.adapter.ScanResult;
import com.bleplx.adapter.utils.Constants;

public class RxScanResultToScanResultMapper {

    public ScanResult map(com.polidea.rxandroidble2.scan.ScanResult rxScanResult) {
        return new ScanResult(
                rxScanResult.getBleDevice().getMacAddress(),
                rxScanResult.getBleDevice().getName(),
                rxScanResult.getRssi(),
                Constants.MINIMUM_MTU,
                false, //isConnectable flag is not available on Android
                null, //overflowServiceUUIDs are not available on Android
                AdvertisementData.parseScanResponseData(rxScanResult.getScanRecord().getBytes())
        );
    }
}
