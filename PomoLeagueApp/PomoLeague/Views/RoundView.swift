import SwiftUI

struct RoundView: View {
    @EnvironmentObject var ledger: Ledger
    @EnvironmentObject var auth: Auth
    @EnvironmentObject var tasks: TaskStore
    @Environment(\.dismiss) private var dismiss
    @Environment(\.scenePhase) private var scenePhase

    @StateObject private var model = RoundModel()
    @State private var confirmChain = false

    var body: some View {
        ZStack {
            switch model.phase {
            case .running: running
            case .breakTime: breakView
            case .failed: failed
            }
        }
        .onAppear {
            model.onBank = { idx, task in
                Banking.bankPomo(ledger: ledger, auth: auth, chainIndex: idx, task: task)
            }
            model.taskProvider = { tasks.currentTask }
            model.begin(chainIndex: 0)
        }
        .onDisappear { model.stop() }
        .onChange(of: scenePhase) { _, newPhase in model.scenePhaseChanged(newPhase) }
    }

    // MARK: Running

    private var running: some View {
        VStack(spacing: 16) {
            Text("FOCUS" + (model.chainIndex > 0 ? " · round \(model.chainIndex + 1)" : ""))
                .font(.headline).foregroundStyle(.white.opacity(0.6)).tracking(3)
            if !tasks.currentTask.isEmpty {
                Text(tasks.currentTask).font(.title3.bold()).foregroundStyle(.white)
            }
            Text(timeString(model.remaining))
                .font(.system(size: 84, weight: .thin, design: .rounded))
                .monospacedDigit().foregroundStyle(.white)
            Text("Leave the app and you lose the round.").font(.subheadline).foregroundStyle(.white.opacity(0.6))

            Text("Hold to give up").foregroundStyle(.white.opacity(0.6))
                .padding(.top, 30)
                .onLongPressGesture(minimumDuration: 0.7) { model.giveUp() }

            #if DEBUG
            Button("⏩ dev: skip to end") { model.devSkip() }
                .font(.footnote).foregroundStyle(.white.opacity(0.35)).padding(.top, 4)
            #endif
        }
        .padding(24)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.pomoInk.ignoresSafeArea())
    }

    // MARK: Break

    private var breakView: some View {
        let next = model.chainIndex + 1
        let needsCheckin = next >= RoundConst.chainCheckinAfter
        return VStack(spacing: 16) {
            Text("BREAK").font(.headline).foregroundStyle(.white.opacity(0.7)).tracking(3)
            Text(timeString(model.breakRemaining))
                .font(.system(size: 84, weight: .thin, design: .rounded)).monospacedDigit().foregroundStyle(.white)
            HStack(spacing: 8) {
                VegIcon(type: .tomato, size: 22, color: .white)
                Text("\(model.sessionBanked) banked this session").foregroundStyle(.white.opacity(0.85)).bold()
            }

            if needsCheckin && confirmChain {
                whiteButton("I'm still here — go") { model.begin(chainIndex: next); confirmChain = false }
            } else {
                whiteButton(needsCheckin ? "Chain again (check-in)" : "Chain next round") {
                    if needsCheckin { confirmChain = true } else { model.begin(chainIndex: next) }
                }
            }
            Button("End session") { endSession() }.foregroundStyle(.white.opacity(0.8)).bold().padding(.top, 4)
        }
        .padding(24)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(red: 0.086, green: 0.263, blue: 0.169).ignoresSafeArea())
    }

    // MARK: Failed

    private var failed: some View {
        VStack(spacing: 14) {
            Text("💔").font(.system(size: 64))
            Text("Round lost").font(.largeTitle.bold()).foregroundStyle(.white)
            Text("Your phone left the app. A dead round banks nothing.")
                .foregroundStyle(.white.opacity(0.85)).multilineTextAlignment(.center)
            if model.sessionBanked > 0 {
                Text("You keep \(model.sessionBanked) pomo(s) from this session.")
                    .font(.subheadline).foregroundStyle(.white.opacity(0.85))
            }
            Button { model.begin(chainIndex: 0); confirmChain = false } label: {
                Text("Restart round").font(.headline).foregroundStyle(Color.pomoTomatoDark)
                    .padding(.horizontal, 28).padding(.vertical, 16)
                    .background(RoundedRectangle(cornerRadius: 14).fill(.white))
            }
            .padding(.top, 12)
            Button("Back to home") { endSession() }.foregroundStyle(.white.opacity(0.85))
        }
        .padding(24)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.pomoTomatoDark.ignoresSafeArea())
    }

    private func whiteButton(_ title: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title).font(.headline).foregroundStyle(Color.pomoInk)
                .padding(.horizontal, 28).padding(.vertical, 16)
                .background(RoundedRectangle(cornerRadius: 14).fill(.white))
        }
        .padding(.top, 20)
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
