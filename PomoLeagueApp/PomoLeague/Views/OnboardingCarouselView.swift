import SwiftUI

struct OnboardingCarouselView: View {
    @EnvironmentObject var profile: ProfileStore
    @State private var index = 0

    private let images = ["knight1", "knight2", "knight3", "knight4"]

    var body: some View {
        ZStack {
            Color.white.ignoresSafeArea()

            VStack(spacing: 0) {
                // Dots — at the top, Figma style (active = wide pill)
                HStack(spacing: 8) {
                    ForEach(0..<images.count, id: \.self) { i in
                        RoundedRectangle(cornerRadius: 3)
                            .fill(Color.pomoRed.opacity(i == index ? 1 : 0.2))
                            .frame(width: i == index ? 20 : 6, height: 6)
                            .animation(.easeInOut(duration: 0.2), value: index)
                    }
                }
                .padding(.top, 60)

                // Slide images — already contain all text
                TabView(selection: $index) {
                    ForEach(0..<images.count, id: \.self) { i in
                        Image(images[i])
                            .resizable()
                            .scaledToFit()
                            .padding(.horizontal, 24)
                            .tag(i)
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: .never))

                // Buttons
                VStack(spacing: 12) {
                    Button(action: advance) {
                        Text("i'm here")
                            .font(.caveatBold(22))
                            .foregroundStyle(Color.pomoRed)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 20)
                            .overlay(
                                RoundedRectangle(cornerRadius: 4)
                                    .stroke(Color.pomoRed, lineWidth: 1.5)
                            )
                    }

                    Button(action: skip) {
                        Text("skip")
                            .font(.caveat(16))
                            .foregroundStyle(Color.pomoRed.opacity(0.45))
                    }
                    .padding(.bottom, 8)
                }
                .padding(.horizontal, 28)
                .padding(.bottom, 32)
            }
        }
        // Swipe also advances
        .gesture(
            DragGesture(minimumDistance: 40, coordinateSpace: .local)
                .onEnded { v in
                    if v.translation.width < 0 { advance() }
                    else if v.translation.width > 0, index > 0 {
                        withAnimation { index -= 1 }
                    }
                }
        )
    }

    private func advance() {
        if index < images.count - 1 {
            withAnimation { index += 1 }
        } else {
            finish()
        }
    }

    private func skip() { finish() }

    private func finish() {
        profile.seenIntro = true
        profile.save()
    }
}
