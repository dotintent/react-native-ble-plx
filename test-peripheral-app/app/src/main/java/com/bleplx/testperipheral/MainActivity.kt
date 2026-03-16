package com.bleplx.testperipheral

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.*
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.BluetoothLeAdvertiser
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.ParcelUuid
import android.util.Log
import android.widget.ScrollView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import java.io.InputStream
import java.io.OutputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.UUID

class MainActivity : AppCompatActivity() {

    companion object {
        private val SERVICE_UUID = UUID.fromString("12345678-1234-1234-1234-123456789abc")
        private val READ_COUNTER_UUID = UUID.fromString("12345678-1234-1234-1234-123456789a01")
        private val WRITE_ECHO_UUID = UUID.fromString("12345678-1234-1234-1234-123456789a02")
        private val NOTIFY_STREAM_UUID = UUID.fromString("12345678-1234-1234-1234-123456789a03")
        private val INDICATE_STREAM_UUID = UUID.fromString("12345678-1234-1234-1234-123456789a04")
        private val MTU_TEST_UUID = UUID.fromString("12345678-1234-1234-1234-123456789a05")
        private val WRITE_NO_RESPONSE_UUID = UUID.fromString("12345678-1234-1234-1234-123456789A06")
        private val L2CAP_PSM_UUID = UUID.fromString("12345678-1234-1234-1234-123456789A07")
        private val CCCD_UUID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")
        private const val TAG = "BlePlxTest"

        private const val REQUEST_PERMISSIONS = 1
    }

    private lateinit var statusText: TextView
    private lateinit var connectionText: TextView
    private lateinit var logText: TextView

    private val handler = Handler(Looper.getMainLooper())
    private var bluetoothManager: BluetoothManager? = null
    private var gattServer: BluetoothGattServer? = null
    private var advertiser: BluetoothLeAdvertiser? = null

    private var connectedDevice: BluetoothDevice? = null
    private var negotiatedMtu: Int = 23

    private var readCounter: Int = 0
    private var echoData: ByteArray = ByteArray(0)
    private var noResponseData: ByteArray = ByteArray(0)

    private var l2capServerSocket: BluetoothServerSocket? = null
    private var l2capThread: Thread? = null
    private var l2capPsm: Int = 0

    private var notifyCounter: Int = 0
    private var indicateCounter: Int = 0
    private var notifyEnabled = false
    private var indicateEnabled = false
    private var indicateInFlight = false

    private val notifyRunnable = object : Runnable {
        override fun run() {
            if (notifyEnabled && connectedDevice != null) {
                sendNotification()
                handler.postDelayed(this, 500)
            }
        }
    }

    private val indicateRunnable = object : Runnable {
        override fun run() {
            if (indicateEnabled && connectedDevice != null && !indicateInFlight) {
                sendIndication()
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        statusText = findViewById(R.id.statusText)
        connectionText = findViewById(R.id.connectionText)
        logText = findViewById(R.id.logText)

        bluetoothManager = getSystemService(BLUETOOTH_SERVICE) as BluetoothManager

        if (checkPermissions()) {
            startPeripheral()
        } else {
            requestPermissions()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        handler.removeCallbacksAndMessages(null)
        try {
            l2capServerSocket?.close()
        } catch (_: Exception) {}
        l2capThread?.interrupt()
        try {
            gattServer?.close()
            advertiser?.stopAdvertising(advertiseCallback)
        } catch (_: SecurityException) {}
    }

    private fun checkPermissions(): Boolean {
        return ActivityCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_ADVERTISE) == PackageManager.PERMISSION_GRANTED &&
                ActivityCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED
    }

    private fun requestPermissions() {
        ActivityCompat.requestPermissions(
            this,
            arrayOf(Manifest.permission.BLUETOOTH_ADVERTISE, Manifest.permission.BLUETOOTH_CONNECT),
            REQUEST_PERMISSIONS
        )
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQUEST_PERMISSIONS && grantResults.all { it == PackageManager.PERMISSION_GRANTED }) {
            startPeripheral()
        } else {
            statusText.text = "Permissions denied"
        }
    }

    private fun startPeripheral() {
        try {
            openGattServer()
            startAdvertising()
        } catch (e: SecurityException) {
            statusText.text = "SecurityException: ${e.message}"
        }
    }

    private fun openGattServer() {
        gattServer = bluetoothManager?.openGattServer(this, gattCallback)
            ?: throw IllegalStateException("Cannot open GATT server")

        val service = BluetoothGattService(SERVICE_UUID, BluetoothGattService.SERVICE_TYPE_PRIMARY)

        // Read Counter
        val readCounterChar = BluetoothGattCharacteristic(
            READ_COUNTER_UUID,
            BluetoothGattCharacteristic.PROPERTY_READ,
            BluetoothGattCharacteristic.PERMISSION_READ
        )
        service.addCharacteristic(readCounterChar)

        // Write Echo
        val writeEchoChar = BluetoothGattCharacteristic(
            WRITE_ECHO_UUID,
            BluetoothGattCharacteristic.PROPERTY_READ or BluetoothGattCharacteristic.PROPERTY_WRITE,
            BluetoothGattCharacteristic.PERMISSION_READ or BluetoothGattCharacteristic.PERMISSION_WRITE
        )
        service.addCharacteristic(writeEchoChar)

        // Notify Stream
        val notifyChar = BluetoothGattCharacteristic(
            NOTIFY_STREAM_UUID,
            BluetoothGattCharacteristic.PROPERTY_READ or BluetoothGattCharacteristic.PROPERTY_NOTIFY,
            BluetoothGattCharacteristic.PERMISSION_READ
        )
        notifyChar.addDescriptor(BluetoothGattDescriptor(CCCD_UUID,
            BluetoothGattDescriptor.PERMISSION_READ or BluetoothGattDescriptor.PERMISSION_WRITE))
        service.addCharacteristic(notifyChar)

        // Indicate Stream
        val indicateChar = BluetoothGattCharacteristic(
            INDICATE_STREAM_UUID,
            BluetoothGattCharacteristic.PROPERTY_READ or BluetoothGattCharacteristic.PROPERTY_INDICATE,
            BluetoothGattCharacteristic.PERMISSION_READ
        )
        indicateChar.addDescriptor(BluetoothGattDescriptor(CCCD_UUID,
            BluetoothGattDescriptor.PERMISSION_READ or BluetoothGattDescriptor.PERMISSION_WRITE))
        service.addCharacteristic(indicateChar)

        // MTU Test
        val mtuChar = BluetoothGattCharacteristic(
            MTU_TEST_UUID,
            BluetoothGattCharacteristic.PROPERTY_READ,
            BluetoothGattCharacteristic.PERMISSION_READ
        )
        service.addCharacteristic(mtuChar)

        // Write Without Response
        val writeNoResponseChar = BluetoothGattCharacteristic(
            WRITE_NO_RESPONSE_UUID,
            BluetoothGattCharacteristic.PROPERTY_READ or BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE,
            BluetoothGattCharacteristic.PERMISSION_READ or BluetoothGattCharacteristic.PERMISSION_WRITE
        )
        service.addCharacteristic(writeNoResponseChar)

        // L2CAP PSM
        val l2capPsmChar = BluetoothGattCharacteristic(
            L2CAP_PSM_UUID,
            BluetoothGattCharacteristic.PROPERTY_READ,
            BluetoothGattCharacteristic.PERMISSION_READ
        )
        service.addCharacteristic(l2capPsmChar)

        gattServer?.addService(service)
        log("GATT server opened with test service")

        startL2capServer()
    }

    private fun startAdvertising() {
        val adapter = bluetoothManager?.adapter ?: return
        adapter.name = "BlePlxTest"
        advertiser = adapter.bluetoothLeAdvertiser

        if (advertiser == null) {
            statusText.text = "BLE advertising not supported"
            return
        }

        val settings = AdvertiseSettings.Builder()
            .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
            .setConnectable(true)
            .setTimeout(0)
            .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
            .build()

        val data = AdvertiseData.Builder()
            .setIncludeDeviceName(true)
            .build()

        val scanResponse = AdvertiseData.Builder()
            .addServiceUuid(ParcelUuid(SERVICE_UUID))
            .build()

        advertiser?.startAdvertising(settings, data, scanResponse, advertiseCallback)
    }

    private val advertiseCallback = object : AdvertiseCallback() {
        override fun onStartSuccess(settingsInEffect: AdvertiseSettings?) {
            runOnUiThread {
                val adapter = BluetoothAdapter.getDefaultAdapter()
                val address = adapter?.address ?: "unknown"
                statusText.text = "Advertising...\nAdapter name: ${adapter?.name}\nMAC: $address"
                log("Advertising started as '${adapter?.name}', address: $address")
            }
        }

        override fun onStartFailure(errorCode: Int) {
            runOnUiThread {
                statusText.text = "Advertising failed: $errorCode"
                log("Advertising failed with error: $errorCode")
            }
        }
    }

    private val gattCallback = object : BluetoothGattServerCallback() {

        override fun onConnectionStateChange(device: BluetoothDevice, status: Int, newState: Int) {
            runOnUiThread {
                if (newState == BluetoothProfile.STATE_CONNECTED) {
                    connectedDevice = device
                    negotiatedMtu = 23
                    connectionText.text = "Connected: ${device.address}"
                    log("Device connected: ${device.address}")
                } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                    notifyEnabled = false
                    indicateEnabled = false
                    handler.removeCallbacks(notifyRunnable)
                    handler.removeCallbacks(indicateRunnable)
                    connectedDevice = null
                    connectionText.text = "No connections"
                    log("Device disconnected: ${device.address}")
                }
            }
        }

        override fun onCharacteristicReadRequest(
            device: BluetoothDevice, requestId: Int, offset: Int,
            characteristic: BluetoothGattCharacteristic
        ) {
            try {
                val value = when (characteristic.uuid) {
                    READ_COUNTER_UUID -> {
                        readCounter++
                        uint32ToBytes(readCounter)
                    }
                    WRITE_ECHO_UUID -> echoData
                    NOTIFY_STREAM_UUID -> uint32ToBytes(notifyCounter)
                    INDICATE_STREAM_UUID -> uint32ToBytes(indicateCounter)
                    MTU_TEST_UUID -> uint16ToBytes(negotiatedMtu)
                    WRITE_NO_RESPONSE_UUID -> noResponseData
                    L2CAP_PSM_UUID -> uint16ToBytes(l2capPsm)
                    else -> ByteArray(0)
                }
                val responseValue = if (offset < value.size) value.copyOfRange(offset, value.size) else ByteArray(0)
                gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, responseValue)
                runOnUiThread { log("READ ${shortUuid(characteristic.uuid)} -> ${value.contentToString()}") }
            } catch (e: SecurityException) {
                runOnUiThread { log("SecurityException on read: ${e.message}") }
            }
        }

        override fun onCharacteristicWriteRequest(
            device: BluetoothDevice, requestId: Int,
            characteristic: BluetoothGattCharacteristic,
            preparedWrite: Boolean, responseNeeded: Boolean,
            offset: Int, value: ByteArray
        ) {
            try {
                when (characteristic.uuid) {
                    WRITE_ECHO_UUID -> {
                        echoData = value
                        runOnUiThread { log("WRITE ${shortUuid(characteristic.uuid)} <- ${value.contentToString()}") }
                    }
                    WRITE_NO_RESPONSE_UUID -> {
                        noResponseData = value
                        runOnUiThread { log("WRITE_NO_RESPONSE ${shortUuid(characteristic.uuid)} <- ${value.contentToString()}") }
                    }
                }
                if (responseNeeded) {
                    gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, value)
                }
            } catch (e: SecurityException) {
                runOnUiThread { log("SecurityException on write: ${e.message}") }
            }
        }

        override fun onDescriptorReadRequest(
            device: BluetoothDevice, requestId: Int, offset: Int,
            descriptor: BluetoothGattDescriptor
        ) {
            try {
                if (descriptor.uuid == CCCD_UUID) {
                    val charUuid = descriptor.characteristic.uuid
                    val value = when (charUuid) {
                        NOTIFY_STREAM_UUID -> if (notifyEnabled)
                            BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
                        else BluetoothGattDescriptor.DISABLE_NOTIFICATION_VALUE
                        INDICATE_STREAM_UUID -> if (indicateEnabled)
                            BluetoothGattDescriptor.ENABLE_INDICATION_VALUE
                        else BluetoothGattDescriptor.DISABLE_NOTIFICATION_VALUE
                        else -> BluetoothGattDescriptor.DISABLE_NOTIFICATION_VALUE
                    }
                    gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, value)
                } else {
                    gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, descriptor.value ?: ByteArray(0))
                }
            } catch (e: SecurityException) {
                runOnUiThread { log("SecurityException on descriptor read: ${e.message}") }
            }
        }

        override fun onDescriptorWriteRequest(
            device: BluetoothDevice, requestId: Int,
            descriptor: BluetoothGattDescriptor,
            preparedWrite: Boolean, responseNeeded: Boolean,
            offset: Int, value: ByteArray
        ) {
            try {
                if (descriptor.uuid == CCCD_UUID) {
                    val charUuid = descriptor.characteristic.uuid
                    when (charUuid) {
                        NOTIFY_STREAM_UUID -> {
                            notifyEnabled = value.contentEquals(BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE)
                            if (notifyEnabled) {
                                notifyCounter = 0
                                handler.post(notifyRunnable)
                                runOnUiThread { log("NOTIFY enabled") }
                            } else {
                                handler.removeCallbacks(notifyRunnable)
                                runOnUiThread { log("NOTIFY disabled") }
                            }
                        }
                        INDICATE_STREAM_UUID -> {
                            indicateEnabled = value.contentEquals(BluetoothGattDescriptor.ENABLE_INDICATION_VALUE)
                            if (indicateEnabled) {
                                indicateCounter = 0
                                indicateInFlight = false
                                handler.post(indicateRunnable)
                                runOnUiThread { log("INDICATE enabled") }
                            } else {
                                handler.removeCallbacks(indicateRunnable)
                                runOnUiThread { log("INDICATE disabled") }
                            }
                        }
                    }
                }
                if (responseNeeded) {
                    gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, value)
                }
            } catch (e: SecurityException) {
                runOnUiThread { log("SecurityException on descriptor write: ${e.message}") }
            }
        }

        override fun onMtuChanged(device: BluetoothDevice, mtu: Int) {
            negotiatedMtu = mtu
            runOnUiThread { log("MTU changed: $mtu") }
        }

        override fun onNotificationSent(device: BluetoothDevice, status: Int) {
            if (indicateEnabled && indicateInFlight) {
                indicateInFlight = false
                handler.postDelayed(indicateRunnable, 1000)
            }
        }
    }

    private fun sendNotification() {
        val device = connectedDevice ?: return
        val char = gattServer?.getService(SERVICE_UUID)?.getCharacteristic(NOTIFY_STREAM_UUID) ?: return
        notifyCounter++
        try {
            char.value = uint32ToBytes(notifyCounter)
            gattServer?.notifyCharacteristicChanged(device, char, false)
        } catch (e: SecurityException) {
            runOnUiThread { log("SecurityException on notify: ${e.message}") }
        }
    }

    private fun sendIndication() {
        val device = connectedDevice ?: return
        val char = gattServer?.getService(SERVICE_UUID)?.getCharacteristic(INDICATE_STREAM_UUID) ?: return
        indicateCounter++
        indicateInFlight = true
        try {
            char.value = uint32ToBytes(indicateCounter)
            gattServer?.notifyCharacteristicChanged(device, char, true)
        } catch (e: SecurityException) {
            indicateInFlight = false
            runOnUiThread { log("SecurityException on indicate: ${e.message}") }
        }
    }

    @SuppressLint("MissingPermission")
    private fun startL2capServer() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            Log.w(TAG, "L2CAP server requires API 29+, skipping")
            runOnUiThread { log("L2CAP server requires API 29+, skipping") }
            return
        }

        try {
            val adapter = bluetoothManager?.adapter ?: return
            l2capServerSocket = adapter.listenUsingInsecureL2capChannel()
            l2capPsm = l2capServerSocket!!.psm
            Log.i(TAG, "L2CAP server listening on PSM: $l2capPsm")
            runOnUiThread { log("L2CAP server listening on PSM: $l2capPsm") }

            l2capThread = Thread {
                while (!Thread.currentThread().isInterrupted) {
                    try {
                        val socket = l2capServerSocket?.accept() ?: break
                        Log.i(TAG, "L2CAP client connected: ${socket.remoteDevice?.address}")
                        runOnUiThread { log("L2CAP client connected: ${socket.remoteDevice?.address}") }

                        // Handle each connection in its own thread
                        Thread {
                            handleL2capConnection(socket)
                        }.start()
                    } catch (e: Exception) {
                        if (!Thread.currentThread().isInterrupted) {
                            Log.e(TAG, "L2CAP accept error: ${e.message}")
                            runOnUiThread { log("L2CAP accept error: ${e.message}") }
                        }
                        break
                    }
                }
            }
            l2capThread?.isDaemon = true
            l2capThread?.start()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start L2CAP server: ${e.message}")
            runOnUiThread { log("Failed to start L2CAP server: ${e.message}") }
        }
    }

    private fun handleL2capConnection(socket: BluetoothSocket) {
        try {
            val inputStream: InputStream = socket.inputStream
            val outputStream: OutputStream = socket.outputStream
            val buffer = ByteArray(512)

            while (!Thread.currentThread().isInterrupted) {
                val bytesRead = inputStream.read(buffer)
                if (bytesRead == -1) break

                Log.i(TAG, "L2CAP read $bytesRead bytes")
                runOnUiThread { log("L2CAP read $bytesRead bytes") }

                outputStream.write(buffer, 0, bytesRead)
                outputStream.flush()
                Log.i(TAG, "L2CAP echoed $bytesRead bytes")
                runOnUiThread { log("L2CAP echoed $bytesRead bytes") }
            }
        } catch (e: Exception) {
            Log.e(TAG, "L2CAP connection error: ${e.message}")
            runOnUiThread { log("L2CAP connection closed: ${e.message}") }
        } finally {
            try { socket.close() } catch (_: Exception) {}
        }
    }

    private fun uint32ToBytes(value: Int): ByteArray {
        return ByteBuffer.allocate(4).order(ByteOrder.LITTLE_ENDIAN).putInt(value).array()
    }

    private fun uint16ToBytes(value: Int): ByteArray {
        return ByteBuffer.allocate(2).order(ByteOrder.LITTLE_ENDIAN).putShort(value.toShort()).array()
    }

    private fun shortUuid(uuid: UUID): String {
        return uuid.toString().takeLast(4)
    }

    private fun log(message: String) {
        val current = logText.text.toString()
        val lines = current.split("\n").takeLast(50)
        logText.text = (lines + message).joinToString("\n")
        val scrollView = logText.parent as? ScrollView
        scrollView?.post { scrollView.fullScroll(ScrollView.FOCUS_DOWN) }
    }
}
