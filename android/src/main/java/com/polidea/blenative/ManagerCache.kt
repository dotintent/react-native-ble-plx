package com.polidea.blenative

import android.bluetooth.BluetoothManager
import android.content.Context
import com.polidea.blenative.centralmanager.CentralManager

class ManagerCache {

    private var currentCentralManager: CentralManager? = null

    fun addCentralManager(context: Context, bluetoothManager: BluetoothManager): Int? {
        if (currentCentralManager != null) {
            return null
        }
        currentCentralManager = CentralManager(context, bluetoothManager, CENTRAL_MANAGER_ID)
        return CENTRAL_MANAGER_ID
    }

    fun centralManager(id: Int): CentralManager? {
        return when (id) {
            CENTRAL_MANAGER_ID -> currentCentralManager
            else -> null
        }
    }

    fun removeCentralManager(id: Int) {
        if (id == CENTRAL_MANAGER_ID) {
            currentCentralManager = null
        }
    }

    companion object {
        const val CENTRAL_MANAGER_ID = 1
    }
}