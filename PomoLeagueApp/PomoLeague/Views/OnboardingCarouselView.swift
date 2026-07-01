import SwiftUI
import UIKit

/// First-run illustrated intro. Swipeable slides, a Next button, and a final
/// "Create account" that hands off to sign-in. Shown once (gated on
/// profile.seenIntro). Drop your art into the Intro1/Intro2/Intro3 image sets;
/// until then each slide falls back to a tomato illustration.
struct OnboardingCarouselView: View {
    @EnvironmentObject var profile: ProfileStore
    @State private var index = 0

    private struct Slide: Identifiable {
        let id = UUID()
        let image: String
        let title: String
        let body: String
    }

    private let slides: [Slide] = [
        Slide(image: "Intro1",
              title: "You've been given\nthe power to focus.",
              body: "A pomo is 25 minutes where you beat the distraction — verified, uninterrupted, all-or-nothing."),
        Slide(image: "Intro2",
              title: "Guard it with\nyour attention.",
              body: "Leave the app mid-round and you lose today's tomatoes — and your streak. That's the whole point."),
        Slide(image: "Intro3",
              title: "Grow it with\nsomeone else.",
              body: "Link up with a partner. Hit your goals and you both climb. Miss them and you both lose."),
    ]

    var body: some View {
        ZStack {
            LinearGradient(colors: [Color.pomoTomato, Color.pomoTomatoDark],
                           startPoint: .top, endPoint: .bottom).ignoresSafeArea()

            VStack(spacing: 24) {
                TabView(selection: $index) {
                    ForEach(Array(slides.enumerated()), id: \.offset) { i, slide in
                        slideView(slide).tag(i)
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: .never))

                dots
                button
            }
            .padding(28)
        }
    }

    private func slideView(_ slide: Slide) -> some View {
        VStack(spacing: 22) {
            Spacer()
            Group {
                if UIImage(named: slide.image) != nil {
                    Image(slide.image).resizable().scaledToFit()
                } else {
                    VegIcon(type: .tomato, size: 160, color: .white, lineWidth: 4)
                }
            }
            .frame(maxHeight: 240)

            Text(slide.title).font(.system(size: 30, weight: .heavy))
                .multilineTextAlignment(.center).foregroundStyle(.white)
            Text(slide.body).font(.body).foregroundStyle(.white.opacity(0.9))
                .multilineTextAlignment(.center).padding(.horizontal, 8)
            Spacer()
        }
    }

    private var dots: some View {
        HStack(spacing: 8) {
            ForEach(0..<slides.count, id: \.self) { i in
                Circle().fill(.white.opacity(i == index ? 1 : 0.35))
                    .frame(width: 8, height: 8)
            }
        }
    }

    private var button: some View {
        Button {
            if index < slides.count - 1 {
                withAnimation { index += 1 }
            } else {
                profile.seenIntro = true
                profile.save()
            }
        } label: {
            Text(index < slides.count - 1 ? "Next" : "Create your account")
                .font(.headline).foregroundStyle(Color.pomoTomato)
                .frame(maxWidth: .infinity).padding()
                .background(RoundedRectangle(cornerRadius: 16).fill(.white))
        }
    }
}
