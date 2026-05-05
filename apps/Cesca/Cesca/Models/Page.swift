import Foundation
import SwiftData

@Model
final class Page {
    var index: Int
    var createdAt: Date
    var updatedAt: Date

    /// Serialized `PKDrawing` data.
    @Attribute(.externalStorage) var drawingData: Data

    /// Cached OCR text from the last sync. `nil` if never recognized.
    var recognizedText: String?

    /// When the page was last successfully pushed to Notion.
    var lastSyncedAt: Date?

    var notebook: Notebook?

    @Relationship(deleteRule: .cascade, inverse: \StrokeRecord.page)
    var strokes: [StrokeRecord] = []

    init(index: Int, drawingData: Data = Data()) {
        self.index = index
        self.createdAt = .now
        self.updatedAt = .now
        self.drawingData = drawingData
    }
}
