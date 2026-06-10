import SwiftUI

/// Drives the active focus session and the persisted garden.
///
/// Core game rule: while a session is "growing", leaving the app
/// (`scenePhase == .background`) kills the plant — it never makes it
/// into your garden.
@MainActor
final class AppModel: ObservableObject {

    enum SessionState { case growing, succeeded, failed }

    struct Session: Identifiable, Equatable {
        let id = UUID()
        let plant: PlantType
        let duration: TimeInterval
        let startedAt: Date
        var state: SessionState = .growing

        var endsAt: Date { startedAt.addingTimeInterval(duration) }
    }

    @Published private(set) var garden: [PlantedPlant] = []
    @Published var session: Session? = nil
    @Published private(set) var now: Date = Date()

    private let store = GardenStore()
    private var ticker: Timer?

    init() { garden = store.load() }

    // MARK: - Derived values

    var remaining: TimeInterval {
        guard let s = session else { return 0 }
        return max(0, s.endsAt.timeIntervalSince(now))
    }

    var progress: Double {
        guard let s = session, s.duration > 0 else { return 0 }
        return min(1, max(0, (s.duration - remaining) / s.duration))
    }

    var totalGrown: Int { garden.count }

    var grownToday: Int {
        let cal = Calendar.current
        return garden.filter { cal.isDateInToday($0.plantedAt) }.count
    }

    // MARK: - Actions

    func plant(_ type: PlantType, minutes: Int) {
        now = Date()
        session = Session(plant: type,
                          duration: TimeInterval(minutes * 60),
                          startedAt: now)
        startTicker()
    }

    func dismissSession() {
        stopTicker()
        session = nil
    }

    /// Called from the app's scene-phase observer.
    func handleScenePhase(_ phase: ScenePhase) {
        if phase == .background { abandonIfGrowing() }
    }

    private func abandonIfGrowing() {
        guard var s = session, s.state == .growing else { return }
        s.state = .failed
        session = s
        stopTicker()
    }

    private func succeed() {
        guard var s = session else { return }
        s.state = .succeeded
        session = s
        stopTicker()
        garden.append(PlantedPlant(id: UUID(),
                                   typeID: s.plant.rawValue,
                                   plantedAt: Date()))
        store.save(garden)
    }

    func resetGarden() {
        garden = []
        store.save(garden)
    }

    // MARK: - Ticker

    private func startTicker() {
        stopTicker()
        ticker = Timer.scheduledTimer(withTimeInterval: 0.25, repeats: true) { [weak self] _ in
            Task { @MainActor in self?.tick() }
        }
    }

    private func stopTicker() {
        ticker?.invalidate()
        ticker = nil
    }

    private func tick() {
        guard let s = session, s.state == .growing else { return }
        now = Date()
        if now >= s.endsAt { succeed() }
    }
}
