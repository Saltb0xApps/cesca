import SwiftUI
import SwiftData

struct EditorView: View {
    @Environment(\.modelContext) private var modelContext
    @State private var draft = Draft()
    @State private var showCaptured = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    MiniMark(values: draft.values)
                        .frame(height: 180)
                        .padding(.horizontal)
                        .padding(.top, 8)

                    TextField("Label this version (optional)", text: $draft.title)
                        .textFieldStyle(.roundedBorder)
                        .padding(.horizontal)

                    ForEach(Domain.allCases) { domain in
                        DomainCard(domain: domain, draft: draft)
                            .padding(.horizontal)
                    }

                    Button(action: capture) {
                        Text("Capture version")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 6)
                    }
                    .buttonStyle(.borderedProminent)
                    .padding(.horizontal)
                    .padding(.top, 4)
                    .padding(.bottom, 24)
                }
            }
            .navigationTitle("Ikigai")
            .scrollDismissesKeyboard(.interactively)
            .alert("Version captured", isPresented: $showCaptured) {
                Button("OK", role: .cancel) { }
            } message: {
                Text("Saved to your archive. Your draft stays as-is.")
            }
        }
    }

    private func capture() {
        let snapshot = draft.makeSnapshot()
        modelContext.insert(snapshot)
        try? modelContext.save()
        showCaptured = true
    }
}

#Preview {
    EditorView()
        .modelContainer(for: IkigaiSnapshot.self, inMemory: true)
}
