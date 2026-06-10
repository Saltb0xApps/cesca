import SwiftUI

/// Full-screen focus session. The plant grows as time passes.
/// Leaving the app kills it (handled in AppModel via scene phase).
struct SessionView: View {
    @EnvironmentObject var model: AppModel
    @State private var shake = false

    var body: some View {
        ZStack {
            background

            if let session = model.session {
                switch session.state {
                case .growing:   growing(session)
                case .succeeded: succeeded(session)
                case .failed:    failed(session)
                }
            } else {
                Color.clear
            }
        }
    }

    // MARK: - Growing

    private func growing(_ session: AppModel.Session) -> some View {
        let progress = model.progress
        let stage = GrowthStage.stage(for: progress)
        let scale = 0.5 + 0.5 * min(1, max(0, (progress - 0.35) / 0.65))

        return VStack(spacing: 24) {
            Text(stageLabel(stage).uppercased())
                .pixelText(13)
                .foregroundStyle(.white.opacity(0.85))
                .padding(.top, 30)

            Text(timeString(model.remaining))
                .pixelText(54)
                .foregroundStyle(.white)

            Spacer()

            mound {
                PixelSpriteView(sprite: sprite(for: session.plant, stage: stage))
                    .frame(width: 150, height: 150)
                    .scaleEffect(stage == .growing ? scale : (stage == .mature ? 1 : 0.8),
                                 anchor: .bottom)
                    .animation(.easeInOut(duration: 0.4), value: stage)
            }

            Spacer()

            VStack(spacing: 6) {
                Text("⚠️ STAY IN THE APP")
                    .pixelText(13)
                    .foregroundStyle(.white)
                Text("Leaving now kills your \(session.plant.displayName.lowercased()).")
                    .pixelText(10)
                    .foregroundStyle(.white.opacity(0.8))
                    .multilineTextAlignment(.center)
            }
            .padding(.bottom, 40)
        }
        .padding(.horizontal, 24)
    }

    // MARK: - Succeeded

    private func succeeded(_ session: AppModel.Session) -> some View {
        VStack(spacing: 22) {
            Spacer()
            Text("🎉").font(.system(size: 64))
            Text("IT GREW!")
                .pixelText(28)
                .foregroundStyle(.white)
            mound {
                PixelSpriteView(sprite: session.plant.matureSprite)
                    .frame(width: 160, height: 160)
                    .transition(.scale)
            }
            Text("Your \(session.plant.displayName.lowercased()) is planted in the garden.")
                .pixelText(11)
                .foregroundStyle(.white.opacity(0.9))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 30)
            Spacer()
            bigButton("BACK TO GARDEN", color: Theme.grass) { model.dismissSession() }
        }
        .padding(.horizontal, 24)
        .padding(.bottom, 36)
    }

    // MARK: - Failed

    private func failed(_ session: AppModel.Session) -> some View {
        VStack(spacing: 22) {
            Spacer()
            Text("💥").font(.system(size: 64))
            Text("IT DIED!")
                .pixelText(28)
                .foregroundStyle(.white)
            mound {
                PixelSpriteView(sprite: Sprites.rotten)
                    .frame(width: 160, height: 160)
                    .offset(x: shake ? -5 : 5)
                    .animation(.easeInOut(duration: 0.08).repeatCount(6, autoreverses: true),
                               value: shake)
            }
            Text("You left the garden, so your \(session.plant.displayName.lowercased()) rotted before it could grow.")
                .pixelText(11)
                .foregroundStyle(.white.opacity(0.9))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 30)
            Spacer()
            bigButton("TRY AGAIN", color: Color(red: 0.90, green: 0.25, blue: 0.22)) {
                model.dismissSession()
            }
        }
        .padding(.horizontal, 24)
        .padding(.bottom, 36)
        .onAppear { shake = true }
    }

    // MARK: - Pieces

    private var background: some View {
        LinearGradient(colors: [Color(red: 0.16, green: 0.22, blue: 0.32),
                                Color(red: 0.28, green: 0.36, blue: 0.46)],
                       startPoint: .top, endPoint: .bottom)
            .ignoresSafeArea()
    }

    private func mound<Content: View>(@ViewBuilder content: () -> Content) -> some View {
        ZStack(alignment: .bottom) {
            Ellipse()
                .fill(Theme.soil)
                .frame(width: 200, height: 60)
                .overlay(Ellipse().fill(Theme.soilDark).frame(width: 200, height: 18)
                    .frame(maxHeight: .infinity, alignment: .bottom))
            content().padding(.bottom, 18)
        }
    }

    private func bigButton(_ title: String, color: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .pixelText(15)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(color)
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(.white.opacity(0.9), lineWidth: 3))
                )
        }
    }

    private func stageLabel(_ stage: GrowthStage) -> String {
        switch stage {
        case .seed:    return "Seed planted"
        case .sprout:  return "Sprouting"
        case .growing: return "Growing"
        case .mature:  return "Ripe!"
        }
    }

    private func timeString(_ t: TimeInterval) -> String {
        let total = Int(t.rounded(.up))
        return String(format: "%02d:%02d", total / 60, total % 60)
    }
}
