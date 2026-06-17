import SwiftUI

/// One editable domain: header, removable chips, and an add field.
struct DomainCard: View {
    let domain: Domain
    @Bindable var draft: Draft

    @State private var entry = ""
    @FocusState private var fieldFocused: Bool

    private var items: [String] { draft.items(for: domain) }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label(domain.title, systemImage: domain.systemImage)
                .font(.headline)
                .foregroundStyle(.primary)

            if items.isEmpty {
                Text("Nothing yet")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            } else {
                FlowLayout(spacing: 8) {
                    ForEach(items, id: \.self) { item in
                        chip(item)
                    }
                }
            }

            HStack(spacing: 8) {
                TextField("Add…", text: $entry)
                    .textFieldStyle(.roundedBorder)
                    .focused($fieldFocused)
                    .submitLabel(.done)
                    .onSubmit(commit)

                Button(action: commit) {
                    Image(systemName: "plus.circle.fill")
                        .font(.title2)
                }
                .disabled(entry.trimmingCharacters(in: .whitespaces).isEmpty)
            }
        }
        .padding(16)
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private func chip(_ item: String) -> some View {
        HStack(spacing: 6) {
            Text(item)
                .font(.subheadline)
            Button {
                withAnimation { draft.remove(item, from: domain) }
            } label: {
                Image(systemName: "xmark.circle.fill")
                    .foregroundStyle(.secondary)
            }
            .buttonStyle(.plain)
        }
        .padding(.vertical, 6)
        .padding(.horizontal, 10)
        .background(DesignTokens.accent.opacity(0.18), in: Capsule())
    }

    private func commit() {
        let text = entry
        guard !text.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        withAnimation { draft.add(text, to: domain) }
        entry = ""
        fieldFocused = true
    }
}
