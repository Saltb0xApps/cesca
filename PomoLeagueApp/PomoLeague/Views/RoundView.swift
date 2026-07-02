import SwiftUI

struct RoundView: View {
    @EnvironmentObject var ledger: Ledger
    @EnvironmentObject var auth: Auth
    @EnvironmentObject var tasks: TaskStore
    @EnvironmentObject var profile: ProfileStore
    @Environment(\.dismiss) private var dismiss
    @Environment(\.scenePhase) private var scenePhase

    @StateObject private var model = RoundModel()
    @State private var confirmChain = false

    var body: some View {
        ZStack {
            switch model.phase {
            case .running:  running
            case .breakTime: breakView
            case .failed:   failed
            }
        }
        .onAppear {
            model.onBank = { idx, task in
                Banking.bankPomo(ledger: ledger, auth: auth, chainIndex: idx, task: task)
            }
            model.onPenalty = {
                ledger.applyPenaltyLocal()
                SharedStore.sync(today: 0, goal: profile.dailyGoal)
                Banking.applyPenalty(auth: auth)
            }
            model.taskProvider = { tasks.currentTask }
            model.begin(chainIndex: 0)
        }
        .onDisappear { model.stop() }
        .onChange(of: scenePhase) { _, newPhase in model.scenePhaseChanged(newPhase) }
    }

    // MARK: Running

    private var running: some View {
        ZStack {
            Color.pomoInk.ignoresSafeArea()

            VStack(spacing: 0) {
                // "FOCUS" header
                Text("FOCUS" + (model.chainIndex > 0 ? "  ·  ROUND \(model.chainIndex + 1)" : ""))
                    .font(.system(size: 13, weight: .semibold))
                    .tracking(4)
                    .foregroundStyle(Color.white.opacity(0.45))
                    .padding(.top, 56)

                Spacer()

                // Circular timer
                CircularTimer(remaining: model.remaining)

                Text("leave the app and you lose the round")
                    .font(.system(size: 13))
                    .foregroundStyle(Color.white.opacity(0.4))
                    .padding(.top, 24)

                Spacer()

                // Hold to give up
                HoldToGiveUp { model.giveUp() }
                    .padding(.horizontal, 28)
                    .padding(.bottom, 40)

                #if DEBUG
                Button("⏩ skip to end") { model.devSkip() }
                    .font(.caption2)
                    .foregroundStyle(Color.white.opacity(0.2))
                    .padding(.bottom, 8)
                #endif
            }
        }
    }

    // MARK: Break

    private var breakView: some View {
        let next = model.chainIndex + 1
        let needsCheckin = next >= RoundConst.chainCheckinAfter
        return ZStack {
            Color(red: 0.086, green: 0.263, blue: 0.169).ignoresSafeArea()

            VStack(spacing: 0) {
                Text("BREAK")
                    .font(.system(size: 13, weight: .semibold))
                    .tracking(4)
                    .foregroundStyle(Color.white.opacity(0.55))
                    .padding(.top, 56)

                Spacer()

                Text(timeString(model.breakRemaining))
                    .font(.system(size: 80, weight: .light))
                    .monospacedDigit()
                    .foregroundStyle(.white)

                HStack(spacing: 6) {
                    Text("🍅").font(.system(size: 16))
                    Text("\(model.sessionBanked) banked this session")
                        .font(.subheadline.bold())
                        .foregroundStyle(Color.white.opacity(0.85))
                }
                .padding(.top, 12)

                Spacer()

                VStack(spacing: 12) {
                    if needsCheckin && confirmChain {
                        roundButton("I'm still here — go", opacity: 1.0) {
                            model.begin(chainIndex: next); confirmChain = false
                        }
                    } else {
                        roundButton(needsCheckin ? "chain again (check-in)" : "chain next round", opacity: 1.0) {
                            if needsCheckin { confirmChain = true } else { model.begin(chainIndex: next) }
                        }
                    }
                    Button("end session") { endSession() }
                        .font(.caveatBold(17))
                        .foregroundStyle(Color.white.opacity(0.7))
                }
                .padding(.horizontal, 28)
                .padding(.bottom, 40)
            }
        }
    }

    // MARK: Failed

    private var failed: some View {
        let backgrounded = model.failReason == .backgrounded
        return ZStack {
            Color(red: 0.125, green: 0.039, blue: 0.039).ignoresSafeArea() // #200a0a

            VStack(spacing: 24) {
                Spacer()

                Image(systemName: "heart.slash.fill")
                    .font(.system(size: 68, weight: .ultraLight))
                    .foregroundStyle(Color.white.opacity(0.9))

                Text("round lost.")
                    .font(.marker(32))
                    .foregroundStyle(.white)

                Text(backgrounded
                     ? "happens to everyone. come back stronger."
                     : "happens to everyone. come back stronger.")
                    .font(.caveat(17))
                    .foregroundStyle(Color.white.opacity(0.55))
                    .multilineTextAlignment(.center)

                Spacer()

                VStack(spacing: 12) {
                    roundButton("restart round", opacity: 1.0) {
                        model.begin(chainIndex: 0); confirmChain = false
                    }
                    roundButton("end session · \(model.sessionBanked) banked", opacity: 0.3) {
                        endSession()
                    }
                }
                .padding(.horizontal, 32)
                .padding(.bottom, 40)
            }
            .padding(.horizontal, 32)
        }
    }

    // MARK: Helpers

    private func roundButton(_ title: String, opacity: Double, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.caveatBold(20))
                .foregroundStyle(Color.white.opacity(opacity))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 18)
                .overlay(
                    RoundedRectangle(cornerRadius: 3)
                        .stroke(Color.white.opacity(opacity), lineWidth: 2)
                )
        }
    }

    private func endSession() {
        model.stop()
        dismiss()
    }

    private func timeString(_ t: TimeInterval) -> String {
        let total = Int(t.rounded(.up))
        return String(format: "%02d:%02d", total / 60, total % 60)
    }
}

// MARK: - Circular Timer

private struct CircularTimer: View {
    let remaining: TimeInterval
    private let total = RoundConst.roundSeconds
    private let radius: CGFloat = 118

    var progress: Double { 1.0 - remaining / total }

    var body: some View {
        ZStack {
            // Background ring
            Circle()
                .stroke(Color.white.opacity(0.08), lineWidth: 1.5)
                .frame(width: radius * 2, height: radius * 2)

            // Cardinal dots (12, 3, 6, 9 o'clock)
            ForEach([0.0, 90.0, 180.0, 270.0], id: \.self) { angle in
                Circle()
                    .fill(Color.pomoTomato)
                    .frame(width: 6, height: 6)
                    .offset(y: -radius)
                    .rotationEffect(.degrees(angle))
            }

            // Sweeping progress dot
            Circle()
                .fill(Color.white)
                .frame(width: 9, height: 9)
                .offset(y: -radius)
                .rotationEffect(.degrees(-90 + 360 * progress))
                .animation(.linear(duration: 0.25), value: progress)

            // Countdown
            Text(timeString(remaining))
                .font(.system(size: 66, weight: .light))
                .monospacedDigit()
                .foregroundStyle(.white)
        }
        .frame(width: radius * 2 + 20, height: radius * 2 + 20)
    }

    private func timeString(_ t: TimeInterval) -> String {
        let total = Int(t.rounded(.up))
        return String(format: "%02d:%02d", total / 60, total % 60)
    }
}

// MARK: - Hold To Give Up Button

private struct HoldToGiveUp: View {
    let onTrigger: () -> Void

    @GestureState private var pressing = false
    @State private var progress: CGFloat = 0
    @State private var timer: Timer?

    var body: some View {
        ZStack(alignment: .leading) {
            RoundedRectangle(cornerRadius: 8)
                .fill(Color.white.opacity(0.06))
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(Color.white.opacity(0.12), lineWidth: 1)
                )

            // Fill bar
            if progress > 0 {
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color.pomoTomato.opacity(0.5))
                    .frame(width: progress * UIScreen.main.bounds.width)
                    .clipped()
            }

            Text("hold to give up")
                .font(.system(size: 14))
                .foregroundStyle(Color.white.opacity(0.35))
                .frame(maxWidth: .infinity)
        }
        .frame(height: 52)
        .gesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in startHold() }
                .onEnded { _ in cancelHold() }
        )
    }

    private func startHold() {
        guard timer == nil else { return }
        timer = Timer.scheduledTimer(withTimeInterval: 0.05, repeats: true) { _ in
            Task { @MainActor in
                progress += 0.05 / 0.7
                if progress >= 1 {
                    cancelHold()
                    onTrigger()
                }
            }
        }
    }

    private func cancelHold() {
        timer?.invalidate()
        timer = nil
        withAnimation(.easeOut(duration: 0.2)) { progress = 0 }
    }
}
