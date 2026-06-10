import SwiftUI

/// Choose what to grow and for how long, then plant it.
struct PlantPickerView: View {
    let onPlant: (PlantType, Int) -> Void

    @State private var selected: PlantType = .tomato
    @State private var minutes: Int = 25

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 12), count: 3)
    private let durations = [15, 25, 50]

    var body: some View {
        VStack(spacing: 20) {
            Text("CHOOSE A SEED")
                .pixelText(18)
                .foregroundStyle(Theme.ink)
                .padding(.top, 20)

            LazyVGrid(columns: columns, spacing: 12) {
                ForEach(PlantType.allCases) { type in
                    seedCell(type)
                }
            }

            // duration picker
            HStack(spacing: 10) {
                ForEach(durations, id: \.self) { d in
                    Button { minutes = d } label: {
                        Text("\(d)m")
                            .pixelText(14)
                            .foregroundStyle(minutes == d ? .white : Theme.ink)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 10)
                            .background(
                                RoundedRectangle(cornerRadius: 8)
                                    .fill(minutes == d ? selected.accent : Color.white.opacity(0.6))
                            )
                    }
                }
            }
            .padding(.horizontal, 24)

            Spacer(minLength: 0)

            Button {
                onPlant(selected, minutes)
            } label: {
                Text("PLANT \(selected.displayName.uppercased())")
                    .pixelText(15)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(selected.accent)
                            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.ink, lineWidth: 3))
                    )
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 24)
        }
        .background(LinearGradient(colors: [Theme.skyLow, .white],
                                   startPoint: .top, endPoint: .bottom).ignoresSafeArea())
    }

    private func seedCell(_ type: PlantType) -> some View {
        Button { selected = type } label: {
            VStack(spacing: 6) {
                PixelSpriteView(sprite: type.matureSprite)
                    .frame(width: 52, height: 52)
                Text(type.displayName)
                    .pixelText(9)
                    .foregroundStyle(Theme.ink)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .background(
                RoundedRectangle(cornerRadius: 10)
                    .fill(.white.opacity(selected == type ? 0.95 : 0.5))
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .stroke(selected == type ? type.accent : .clear, lineWidth: 3)
                    )
            )
        }
    }
}
