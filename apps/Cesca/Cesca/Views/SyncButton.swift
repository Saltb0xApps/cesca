import SwiftUI
import SwiftData
import PencilKit

struct SyncButton: View {
    let page: Page
    @Environment(\.modelContext) private var context
    @Query private var settingsList: [AppSettings]
    @State private var state: SyncState = .idle

    private enum SyncState: Equatable {
        case idle
        case running
        case success
        case failure(String)
    }

    var body: some View {
        Button {
            Task { await sync() }
        } label: {
            switch state {
            case .idle:    Label("Sync to Notion", systemImage: "arrow.up.doc")
            case .running: ProgressView()
            case .success: Label("Synced", systemImage: "checkmark.circle.fill").foregroundStyle(.green)
            case .failure: Label("Failed", systemImage: "exclamationmark.triangle.fill").foregroundStyle(.red)
            }
        }
        .disabled(state == .running)
    }

    private func sync() async {
        state = .running
        guard let settings = settingsList.first,
              !settings.notionToken.isEmpty,
              !settings.notionPageId.isEmpty else {
            state = .failure("Set Notion token & page id in Settings.")
            return
        }
        guard let drawing = try? PKDrawing(data: page.drawingData), !drawing.strokes.isEmpty else {
            state = .failure("Page is empty.")
            return
        }

        let bounds = drawing.bounds.insetBy(dx: -16, dy: -16)
        let image = drawing.image(from: bounds, scale: 2)

        do {
            let text = try await HandwritingRecognizer.recognize(
                image: image,
                language: settings.recognitionLanguage
            )
            page.recognizedText = text

            let header = "Cesca page \(page.index + 1) — \(page.updatedAt.formatted(date: .abbreviated, time: .shortened))"
            try await NotionService(token: settings.notionToken)
                .appendText(header: header, body: text, toPageId: settings.notionPageId)

            page.lastSyncedAt = .now
            state = .success
        } catch {
            state = .failure(error.localizedDescription)
        }
    }
}
