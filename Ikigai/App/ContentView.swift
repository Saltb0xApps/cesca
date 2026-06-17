import SwiftUI

struct ContentView: View {
    var body: some View {
        TabView {
            EditorView()
                .tabItem {
                    Label("Edit", systemImage: "square.and.pencil")
                }

            ArchiveListView()
                .tabItem {
                    Label("Archive", systemImage: "clock.arrow.circlepath")
                }
        }
    }
}

#Preview {
    ContentView()
        .modelContainer(for: IkigaiSnapshot.self, inMemory: true)
}
