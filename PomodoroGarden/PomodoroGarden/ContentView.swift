import SwiftUI

struct ContentView: View {
    @EnvironmentObject var model: AppModel
    @State private var showPicker = false

    var body: some View {
        ZStack {
            SkyBackground()

            VStack(spacing: 14) {
                header

                GardenView(plants: model.garden)

                PlantButton { showPicker = true }
                    .padding(.bottom, 8)
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
        }
        .sheet(isPresented: $showPicker) {
            PlantPickerView { type, minutes in
                showPicker = false
                model.plant(type, minutes: minutes)
            }
            .presentationDetents([.medium, .large])
        }
        .fullScreenCover(item: Binding(
            get: { model.session },
            set: { if $0 == nil { model.dismissSession() } }
        )) { _ in
            SessionView()
        }
    }

    private var header: some View {
        VStack(spacing: 8) {
            Text("PIXEL GARDEN")
                .pixelText(26)
                .foregroundStyle(Theme.ink)

            HStack(spacing: 18) {
                stat(value: model.grownToday, label: "today")
                stat(value: model.totalGrown, label: "all time")
            }
        }
        .padding(.top, 24)
    }

    private func stat(value: Int, label: String) -> some View {
        VStack(spacing: 2) {
            Text("\(value)").pixelText(22).foregroundStyle(Theme.ink)
            Text(label).pixelText(10).foregroundStyle(Theme.ink.opacity(0.7))
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
        .background(RoundedRectangle(cornerRadius: 10).fill(.white.opacity(0.45)))
    }
}

/// Big chunky pixel-styled call to action.
struct PlantButton: View {
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text("🍅  PLANT A POMODORO")
                .pixelText(15)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color(red: 0.90, green: 0.25, blue: 0.22))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Theme.ink, lineWidth: 3)
                        )
                )
        }
    }
}
