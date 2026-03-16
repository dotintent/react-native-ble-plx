import SwiftUI

struct ContentView: View {
    @StateObject private var bleManager = BLEPeripheralManager()

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Title
            Text("BlePlxTest")
                .font(.largeTitle)
                .bold()
                .padding(.horizontal)
                .padding(.top, 8)

            Divider().padding(.vertical, 4)

            // Status section
            VStack(alignment: .leading, spacing: 4) {
                Text("Status")
                    .font(.headline)
                Text(bleManager.statusText)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                if !bleManager.peripheralIdentifier.isEmpty {
                    Text("ID: \(bleManager.peripheralIdentifier)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .padding(.horizontal)

            Divider().padding(.vertical, 4)

            // Connection section
            VStack(alignment: .leading, spacing: 4) {
                Text("Connection")
                    .font(.headline)
                Text(bleManager.connectionText)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            .padding(.horizontal)

            Divider().padding(.vertical, 4)

            // Log section
            VStack(alignment: .leading, spacing: 4) {
                Text("Log")
                    .font(.headline)
                    .padding(.horizontal)

                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 2) {
                            ForEach(Array(bleManager.logLines.enumerated()), id: \.offset) { index, line in
                                Text(line)
                                    .font(.system(.caption, design: .monospaced))
                                    .id(index)
                            }
                        }
                        .padding(.horizontal)
                    }
                    .onChange(of: bleManager.logLines.count) { _ in
                        if let last = bleManager.logLines.indices.last {
                            withAnimation {
                                proxy.scrollTo(last, anchor: .bottom)
                            }
                        }
                    }
                }
            }
        }
    }
}
