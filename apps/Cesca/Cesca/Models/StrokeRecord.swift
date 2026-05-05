import Foundation
import SwiftData

/// A lightweight record of when a single stroke was drawn.
///
/// We don't store the geometry here — the canonical drawing geometry lives in
/// `Page.drawingData` (a serialized `PKDrawing`). This record only exists so we
/// can answer "which minutes of which day did the user write?" without parsing
/// the drawing blob.
@Model
final class StrokeRecord {
    var startedAt: Date
    var endedAt: Date
    var page: Page?

    init(startedAt: Date, endedAt: Date) {
        self.startedAt = startedAt
        self.endedAt = endedAt
    }

    var duration: TimeInterval { endedAt.timeIntervalSince(startedAt) }
}
