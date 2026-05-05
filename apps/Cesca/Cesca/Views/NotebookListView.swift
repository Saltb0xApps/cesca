import SwiftUI
import SwiftData

struct NotebookListView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: \Notebook.createdAt, order: .reverse) private var notebooks: [Notebook]
    @State private var showingNewNotebook = false
    @State private var newTitle = ""

    var body: some View {
        NavigationSplitView {
            List {
                ForEach(notebooks) { notebook in
                    NavigationLink(value: notebook) {
                        NotebookRow(notebook: notebook)
                    }
                }
                .onDelete(perform: delete)
            }
            .navigationTitle("Notebooks")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    NavigationLink {
                        StatsView()
                    } label: {
                        Image(systemName: "chart.bar.xaxis")
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    NavigationLink {
                        SettingsView()
                    } label: {
                        Image(systemName: "gearshape")
                    }
                }
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        newTitle = ""
                        showingNewNotebook = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .navigationDestination(for: Notebook.self) { notebook in
                NotebookView(notebook: notebook)
            }
            .alert("New Notebook", isPresented: $showingNewNotebook) {
                TextField("Title", text: $newTitle)
                Button("Create") { create() }
                Button("Cancel", role: .cancel) { }
            }
        } detail: {
            ContentUnavailableView("Pick a notebook", systemImage: "book", description: Text("Choose a notebook on the left, or create a new one."))
        }
    }

    private func create() {
        let title = newTitle.trimmingCharacters(in: .whitespaces)
        guard !title.isEmpty else { return }
        let nb = Notebook(title: title)
        nb.pages.append(Page(index: 0))
        context.insert(nb)
    }

    private func delete(at offsets: IndexSet) {
        for i in offsets { context.delete(notebooks[i]) }
    }
}

private struct NotebookRow: View {
    let notebook: Notebook

    var body: some View {
        HStack {
            RoundedRectangle(cornerRadius: 4)
                .fill(Color(hex: notebook.colorHex))
                .frame(width: 6, height: 36)
            VStack(alignment: .leading) {
                Text(notebook.title).font(.headline)
                Text("\(notebook.pages.count) page\(notebook.pages.count == 1 ? "" : "s")")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }
}
