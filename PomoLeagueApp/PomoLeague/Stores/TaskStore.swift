import Foundation

@MainActor
final class TaskStore: ObservableObject {
    @Published var currentTask = "" {
        didSet { UserDefaults.standard.set(currentTask, forKey: key) }
    }

    private let key = "pomoleague.currentTask.v1"

    init() {
        currentTask = UserDefaults.standard.string(forKey: key) ?? ""
    }
}
