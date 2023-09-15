# Getting Started

## Setup and usage BLE device emulator

To test the BLE-PLX library you will need:

- BLE-PLX-example.xml (file is placed next to this file)
- nRF Connect
  - https://play.google.com/store/apps/details?id=no.nordicsemi.android.mcp&hl=pl&gl=US
  - https://apps.apple.com/pl/app/nrf-connect-for-mobile/id1054362403?l=pl

To configure server:

- open nRF Connect app
- go to the `Configure GATT server` screen
- open the import option from the top bar and import BLE-PLX-example.xml
- go to the `ADVERTISER` tab and setup advertising packet
  - mark the `Connectable` checkbox
  - name your advertiser `BLX-PLX-test`
  - add new flags `Complete Local Name` record to `Advertising data`
  - add new flags `Service UUID` record with `Device time` (0x1847) service to `Advertising data`
  - add new flags `Complete Local Name` record to `Scan Response data`
  - add new flags `Service UUID` record with `Device time` (0x1847) service to `Scan Response data`
  - click `ok` button
- turn on your `BLX-PLX-test` advertiser
- go to the example app and click `Go to nRF test`
  - type into `Device name to connect` your `Complete Local Name` from the server
  - click `Start` (If your phone does not have the permissions to access BLE, it will ask for them first, after granting the permissions, click Start again)
  - when app start `Monitor current time characteristic for device` test case, go back to your advertiser
    - in the advertiser click `SERVER` tab
    - open `Device Time` service
    - click send icon next to `Current Time characteristic`
    - send `Hi, it works!` value as TEXT(UTF-8)
- all step should finish as success with check mark icon

step by step video: https://youtu.be/DZxEbOC8Sy4
