import SwiftUI

struct GardenView: View {
    @EnvironmentObject var ledger: Ledger
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        let total = ledger.stats.total
        let grown = Veggies.unlockedCount(total: total)
        let next = Veggies.next(total: total)

        return ZStack {
            Color.pomoBg.ignoresSafeArea()

            VStack(spacing: 0) {
                // Header
                HStack {
                    Button { dismiss() } label: {
                        Image(systemName: "arrow.left")
                            .font(.system(size: 18, weight: .medium))
                            .foregroundStyle(Color.pomoRed)
                    }
                    Spacer()
                    Text("GARDEN.")
                        .font(.marker(28))
                        .foregroundStyle(Color.pomoRed)
                }
                .padding(.horizontal, 24)
                .padding(.top, 56)
                .padding(.bottom, 4)

                Text("\(grown) / \(Veggies.all.count) grown"
                     + (next.map { " · \($0.remaining) more for a \($0.veg.name.lowercased())" } ?? " · all grown 🎉"))
                    .font(.caveat(14))
                    .foregroundStyle(Color.pomoRedFaded)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 24)
                    .padding(.bottom, 20)

                ScrollView {
                    LazyVGrid(
                        columns: Array(repeating: GridItem(.flexible(), spacing: 12), count: 3),
                        spacing: 12
                    ) {
                        ForEach(Veggies.all) { veg in
                            let open = Veggies.isUnlocked(veg, total: total)
                            VStack(spacing: 8) {
                                VegIcon(type: veg.type, size: 52,
                                        color: open ? .pomoRed : .pomoRed.opacity(0.2))

                                Text(open ? veg.name : "🔒 \(veg.unlockAt)")
                                    .font(open ? .caveatBold(14) : .caveat(13))
                                    .foregroundStyle(open ? Color.pomoRed : Color.pomoRedFaded)
                                    .multilineTextAlignment(.center)
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 110)
                            .background(
                                RoundedRectangle(cornerRadius: 4)
                                    .fill(open ? Color.pomoRed.opacity(0.05) : Color.white)
                                    .overlay(RoundedRectangle(cornerRadius: 4)
                                        .stroke(Color.pomoRed, lineWidth: open ? 1.5 : 1))
                            )
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 40)
                }
            }
        }
    }
}
