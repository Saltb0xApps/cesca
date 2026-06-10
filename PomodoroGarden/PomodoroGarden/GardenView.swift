import SwiftUI

/// Sky + sun + rolling hill backdrop for the whole app.
struct SkyBackground: View {
    var body: some View {
        ZStack {
            LinearGradient(colors: [Theme.sky, Theme.skyLow],
                           startPoint: .top, endPoint: .bottom)

            // pixel sun in the corner
            PixelSpriteView(sprite: PixelSprite(rows: [
                "..yy..",
                ".yYYy.",
                "yYYYYy",
                "yYYYYy",
                ".yYYy.",
                "..yy..",
            ]))
            .frame(width: 64, height: 64)
            .position(x: 56, y: 80)
        }
        .ignoresSafeArea()
    }
}

/// The garden: a grid of dirt plots holding every plant you've grown.
struct GardenView: View {
    let plants: [PlantedPlant]
    private let columns = Array(repeating: GridItem(.flexible(), spacing: 8), count: 4)

    var body: some View {
        ScrollView {
            if plants.isEmpty {
                EmptyPlot()
                    .padding(.top, 40)
            } else {
                LazyVGrid(columns: columns, spacing: 8) {
                    ForEach(plants.reversed()) { p in
                        DirtPlot { PixelSpriteView(sprite: p.type.matureSprite) }
                    }
                }
                .padding(.vertical, 8)
            }
        }
    }
}

/// A single soil square with a plant sitting on top.
struct DirtPlot<Content: View>: View {
    @ViewBuilder var content: Content

    var body: some View {
        ZStack(alignment: .bottom) {
            RoundedRectangle(cornerRadius: 6)
                .fill(Theme.soil)
                .overlay(
                    RoundedRectangle(cornerRadius: 6)
                        .fill(Theme.soilDark)
                        .frame(height: 10)
                        .frame(maxHeight: .infinity, alignment: .bottom)
                )
            content
                .frame(width: 56, height: 56)
                .padding(.bottom, 4)
        }
        .frame(height: 72)
    }
}

struct EmptyPlot: View {
    var body: some View {
        VStack(spacing: 14) {
            DirtPlot { Color.clear }
                .frame(width: 90)
            Text("Your garden is empty.")
                .pixelText(13)
                .foregroundStyle(Theme.ink)
            Text("Plant a pomodoro to grow your first plant!")
                .pixelText(10)
                .multilineTextAlignment(.center)
                .foregroundStyle(Theme.ink.opacity(0.7))
        }
        .padding()
    }
}
