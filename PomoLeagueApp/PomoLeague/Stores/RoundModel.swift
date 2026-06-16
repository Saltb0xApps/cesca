import SwiftUI

enum RoundConst {
    static let roundSeconds: TimeInterval = 25 * 60
    static let breakSeconds: TimeInterval = 5 * 60
    static let backgroundGrace: TimeInterval = 10
    static let chainCheckinAfter = 4
}

/// Round session state machine: running → (break | failed). Banking a completed
/// pomo is delegated to `onBank` (set by the view, which calls Banking).
@MainActor
final class RoundModel: ObservableObject {
    enum Phase { case running, breakTime, failed }

    @Published var phase: Phase = .running
    @Published var chainIndex = 0
    @Published var sessionBanked = 0
    @Published var now = Date()

    private var startedAt = Date()
    private var breakStartedAt = Date()
    private var bankedThisRound = false
    private var timer: Timer?

    private var leftAt: Date?
    private var backgroundedTotal: TimeInterval = 0

    /// (chainIndex, task) -> bank a pomo.
    var onBank: ((Int, String?) -> Void)?
    var taskProvider: (() -> String?)?

    // Derived
    var remaining: TimeInterval { max(0, RoundConst.roundSeconds - now.timeIntervalSince(startedAt)) }
    var breakRemaining: TimeInterval { max(0, ceil(RoundConst.breakSeconds - now.timeIntervalSince(breakStartedAt))) }

    func begin(chainIndex idx: Int) {
        phase = .running
        chainIndex = idx
        startedAt = Date()
        now = Date()
        bankedThisRound = false
        leftAt = nil
        backgroundedTotal = 0
        startTimer()
    }

    func startBreak() {
        phase = .breakTime
        breakStartedAt = Date()
        now = Date()
        stopTimer()
        startTimer() // keep ticking for the break countdown
    }

    func giveUp() {
        phase = .failed
        stopTimer()
    }

    func stop() { stopTimer() }

    // MARK: scene phase (foreground enforcement)

    func scenePhaseChanged(_ newPhase: ScenePhase) {
        guard phase == .running else { return }
        if newPhase == .active {
            if let left = leftAt {
                backgroundedTotal += Date().timeIntervalSince(left)
                leftAt = nil
                if backgroundedTotal > RoundConst.backgroundGrace {
                    phase = .failed
                    stopTimer()
                }
            }
        } else {
            if leftAt == nil { leftAt = Date() }
        }
    }

    // MARK: timer

    private func startTimer() {
        stopTimer()
        timer = Timer.scheduledTimer(withTimeInterval: 0.25, repeats: true) { [weak self] _ in
            Task { @MainActor in self?.tick() }
        }
    }

    private func stopTimer() {
        timer?.invalidate()
        timer = nil
    }

    private func tick() {
        now = Date()
        guard phase == .running, !bankedThisRound else { return }
        if now.timeIntervalSince(startedAt) >= RoundConst.roundSeconds {
            bankedThisRound = true
            onBank?(chainIndex, taskProvider?())
            sessionBanked += 1
            startBreak()
        }
    }

    /// Dev helper: jump near the end so the bank/break flow is testable.
    func devSkip() {
        startedAt = Date().addingTimeInterval(-(RoundConst.roundSeconds - 2))
    }
}
