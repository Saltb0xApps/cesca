import SwiftUI

struct GardenView: View {
    @EnvironmentObject var ledger: Ledger
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        let total = ledger.stats.total
        let grown = Veggies.unlockedCount(total: total)
        let next = Veggies.next(total: total)

        VStack(spacing: 0) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Your garden").font(.largeTitle.bold()).foregroundStyle(Color.pomoInk)
                Text("\(grown) / \(Veggies.all.count) grown" +
                     (next.map { " · \($0.remaining) more pomos to grow a \($0.veg.name.lowercased())" } ?? " · all grown 🎉"))
                    .font(.caption).foregroundStyle(Color.pomoSubtle)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(20)

            ScrollView {
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 12), count: 3), spacing: 12) {
                    ForEach(Veggies.all) { veg in
                        let open = Veggies.isUnlocked(veg, total: total)
                        VStack(spacing: 6) {
                            VegIcon(type: veg.type, size: 60, color: open ? .pomoTomato : .pomoLine)
                            Text(open ? veg.name : "🔒 \(veg.unlockAt)")
                                .font(.subheadline.bold())
                                .foregroundStyle(open ? Color.pomoInk : Color.pomoSubtle)
                        }
                        .frame(maxWidth: .infinity).frame(height: 120)
                        .background(RoundedRectangle(cornerRadius: 16).fill(open ? Color.pomoCard : Color.pomoBg)
                            .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.pomoLine)))
                    }
                }
                .padding(.horizontal, 16)
            }

            Button("Done") { dismiss() }.font(.headline).foregroundStyle(Color.pomoTomato).padding()
        }
        .background(Color.pomoBg.ignoresSafeArea())
    }
}
