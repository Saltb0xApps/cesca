import SwiftUI
import SwiftData

struct NotebookView: View {
    @Bindable var notebook: Notebook
    @Environment(\.modelContext) private var context
    @State private var selectedPageIndex: Int = 0

    var body: some View {
        let pages = notebook.sortedPages

        VStack(spacing: 0) {
            if pages.isEmpty {
                ContentUnavailableView("No pages", systemImage: "doc")
            } else {
                let safeIndex = min(max(0, selectedPageIndex), pages.count - 1)
                PageView(page: pages[safeIndex])
                    .id(pages[safeIndex].id)

                Divider()
                pageStrip(pages: pages, selected: safeIndex)
            }
        }
        .navigationTitle(notebook.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    addPage()
                } label: {
                    Label("New page", systemImage: "plus.rectangle")
                }
            }
            ToolbarItem(placement: .topBarTrailing) {
                let pages = notebook.sortedPages
                if !pages.isEmpty {
                    let safeIndex = min(max(0, selectedPageIndex), pages.count - 1)
                    SyncButton(page: pages[safeIndex])
                }
            }
        }
    }

    private func pageStrip(pages: [Page], selected: Int) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(Array(pages.enumerated()), id: \.element.id) { idx, page in
                    Button {
                        selectedPageIndex = idx
                    } label: {
                        VStack(spacing: 2) {
                            RoundedRectangle(cornerRadius: 4)
                                .stroke(idx == selected ? Color.accentColor : Color.gray.opacity(0.4),
                                        lineWidth: idx == selected ? 2 : 1)
                                .frame(width: 48, height: 64)
                                .overlay(Text("\(idx + 1)").font(.caption2))
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(8)
        }
        .frame(height: 84)
        .background(.thinMaterial)
    }

    private func addPage() {
        let next = (notebook.pages.map(\.index).max() ?? -1) + 1
        let page = Page(index: next)
        page.notebook = notebook
        notebook.pages.append(page)
        context.insert(page)
        selectedPageIndex = notebook.sortedPages.count - 1
    }
}
