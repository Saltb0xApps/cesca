import Foundation

/// Tiny app-wide signal for surfacing transient errors as a banner. Shared
/// singleton so fire-and-forget services (Banking) can post to it without
/// threading a reference everywhere.
@MainActor
final class AppState: ObservableObject {
    static let shared = AppState()
    @Published var errorMessage: String?

    func show(_ message: String) {
        errorMessage = message
    }

    func clear() { errorMessage = nil }
}
