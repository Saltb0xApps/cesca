import Foundation
import SwiftData

@Model
final class Notebook {
    var title: String
    var createdAt: Date
    var colorHex: String

    @Relationship(deleteRule: .cascade, inverse: \Page.notebook)
    var pages: [Page] = []

    init(title: String, colorHex: String = "#7C5CFF") {
        self.title = title
        self.createdAt = .now
        self.colorHex = colorHex
    }

    var sortedPages: [Page] {
        pages.sorted { $0.index < $1.index }
    }
}
