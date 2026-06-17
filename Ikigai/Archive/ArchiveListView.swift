import SwiftUI
import SwiftData

struct ArchiveListView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \IkigaiSnapshot.createdAt, order: .reverse) private var snapshots: [IkigaiSnapshot]

    var body: some View {
        NavigationStack {
            Group {
                if snapshots.isEmpty {
                    ContentUnavailableView(
                        "No versions yet",
                        systemImage: "sparkles",
                        description: Text("Capture a version from the Edit tab to start your archive.")
                    )
                } else {
                    List {
                        ForEach(snapshots) { snapshot in
                            row(snapshot)
                        }
                        .onDelete(perform: delete)
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Archive")
            .toolbar {
                if !snapshots.isEmpty {
                    EditButton()
                }
            }
        }
    }

    private func row(_ snapshot: IkigaiSnapshot) -> some View {
        HStack(spacing: 14) {
            MiniMark(values: snapshot.domainValues)
                .frame(width: 56, height: 56)

            VStack(alignment: .leading, spacing: 4) {
                Text(snapshot.title.isEmpty ? "Untitled" : snapshot.title)
                    .font(.headline)
                Text(snapshot.createdAt.formatted(date: .abbreviated, time: .shortened))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            Text("\(Int((snapshot.convergence * 100).rounded()))%")
                .font(.subheadline.monospacedDigit())
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 4)
    }

    private func delete(at offsets: IndexSet) {
        for index in offsets {
            modelContext.delete(snapshots[index])
        }
        try? modelContext.save()
    }
}

#Preview {
    ArchiveListView()
        .modelContainer(for: IkigaiSnapshot.self, inMemory: true)
}
