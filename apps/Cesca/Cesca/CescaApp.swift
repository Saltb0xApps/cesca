import SwiftUI
import SwiftData

@main
struct CescaApp: App {
    var body: some Scene {
        WindowGroup {
            NotebookListView()
        }
        .modelContainer(for: [
            Notebook.self,
            Page.self,
            StrokeRecord.self,
            AppSettings.self
        ])
    }
}
