import SwiftUI
import SwiftData
import PencilKit

struct PageView: View {
    @Bindable var page: Page
    @Environment(\.modelContext) private var context

    var body: some View {
        let initial = (try? PKDrawing(data: page.drawingData)) ?? PKDrawing()

        CanvasView(initialDrawing: initial) { drawing, addedStamps in
            page.drawingData = drawing.dataRepresentation()
            page.updatedAt = .now
            for stamp in addedStamps {
                let record = StrokeRecord(startedAt: stamp.start, endedAt: stamp.end)
                record.page = page
                page.strokes.append(record)
                context.insert(record)
            }
        }
        .background(Color(.systemBackground))
    }
}
