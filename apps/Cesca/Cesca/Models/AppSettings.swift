import Foundation
import SwiftData

@Model
final class AppSettings {
    /// Notion internal integration token (`secret_...`).
    var notionToken: String
    /// Notion page id (32 hex chars, no dashes) we will append blocks to.
    var notionPageId: String
    /// Recognition language for Vision (e.g. "en-US", "it-IT").
    var recognitionLanguage: String

    init(notionToken: String = "", notionPageId: String = "", recognitionLanguage: String = "en-US") {
        self.notionToken = notionToken
        self.notionPageId = notionPageId
        self.recognitionLanguage = recognitionLanguage
    }
}
