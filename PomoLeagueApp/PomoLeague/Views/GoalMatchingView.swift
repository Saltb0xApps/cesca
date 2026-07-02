import SwiftUI

private let goalOptions: [(emoji: String, label: String, sublabel: String)] = [
    ("🩺", "Med school / USMLE",  "Step 1, Step 2, boards"),
    ("⚖️", "Bar exam",            "MBE, essay, MPT prep"),
    ("🎓", "Final exams",         "undergrad / postgrad"),
    ("📝", "Thesis / dissertation","research writing"),
    ("🌍", "Language learning",   "vocab, grammar, fluency"),
    ("💻", "Tech / coding",       "LeetCode, certs, CS"),
    ("📚", "General studying",    "whatever it takes"),
]

struct GoalMatchingView: View {
    @EnvironmentObject var profile: ProfileStore
    @State private var selected: Int? = nil

    var body: some View {
        ZStack {
            Color(red: 0.980, green: 0.969, blue: 0.957).ignoresSafeArea()

            VStack(spacing: 0) {
                // Header
                VStack(alignment: .leading, spacing: 6) {
                    Text("what are you\nstudying for?")
                        .font(.marker(34))
                        .foregroundStyle(Color.pomoRed)
                        .lineSpacing(4)

                    Text("we'll match you with people on the same grind.")
                        .font(.caveat(17))
                        .foregroundStyle(Color.pomoRedFaded)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 24)
                .padding(.top, 64)
                .padding(.bottom, 24)

                // Goal list
                ScrollView {
                    VStack(spacing: 10) {
                        ForEach(goalOptions.indices, id: \.self) { i in
                            goalCard(i)
                        }
                    }
                    .padding(.horizontal, 24)
                    .padding(.bottom, 24)
                }

                // Accountability explainer (shown when something selected)
                if selected != nil {
                    VStack(spacing: 6) {
                        HStack(spacing: 10) {
                            Text("🤝")
                                .font(.system(size: 20))
                            Text("you'll be placed with people studying the same thing — same pressure, same grind.")
                                .font(.caveat(15))
                                .foregroundStyle(Color.pomoRedFaded)
                                .multilineTextAlignment(.leading)
                        }
                        .padding(.horizontal, 24)
                        .padding(.vertical, 12)
                        .background(Color.white)
                        .overlay(RoundedRectangle(cornerRadius: 4).stroke(Color.pomoRed.opacity(0.3), lineWidth: 1))
                        .padding(.horizontal, 24)
                    }
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                }

                // Continue button
                Button(action: finish) {
                    Text(selected == nil ? "skip for now" : "let's go →")
                        .font(.caveatBold(22))
                        .foregroundStyle(selected == nil ? Color.pomoRedFaded : Color.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 20)
                        .background(
                            RoundedRectangle(cornerRadius: 4)
                                .fill(selected == nil ? Color.clear : Color.pomoRed)
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 4)
                                .stroke(selected == nil ? Color.pomoRed.opacity(0.3) : Color.pomoRed, lineWidth: 1.5)
                        )
                }
                .padding(.horizontal, 24)
                .padding(.vertical, 16)
                .animation(.easeInOut(duration: 0.2), value: selected)
            }
        }
    }

    private func goalCard(_ i: Int) -> some View {
        let opt = goalOptions[i]
        let isSelected = selected == i
        return Button {
            withAnimation(.easeInOut(duration: 0.18)) { selected = isSelected ? nil : i }
            if !isSelected, let tag = selectedTag(i) {
                profile.examTag = tag
                profile.save()
            }
        } label: {
            HStack(spacing: 14) {
                Text(opt.emoji)
                    .font(.system(size: 26))
                    .frame(width: 36)

                VStack(alignment: .leading, spacing: 2) {
                    Text(opt.label)
                        .font(.caveatBold(18))
                        .foregroundStyle(Color.pomoRed)
                    Text(opt.sublabel)
                        .font(.caveat(14))
                        .foregroundStyle(Color.pomoRedFaded)
                }

                Spacer()

                if isSelected {
                    Image(systemName: "checkmark")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(Color.pomoRed)
                }
            }
            .padding(14)
            .background(isSelected ? Color.pomoRed.opacity(0.06) : Color.white)
            .overlay(
                RoundedRectangle(cornerRadius: 4)
                    .stroke(Color.pomoRed, lineWidth: isSelected ? 2 : 1.5)
            )
            .cornerRadius(4)
        }
    }

    private func selectedTag(_ i: Int) -> String? {
        switch i {
        case 0: return "USMLE"
        case 1: return "Bar Exam"
        case 2: return "Finals"
        case 3: return "Thesis"
        case 4: return "Language"
        case 5: return "Coding"
        default: return nil
        }
    }

    private func finish() {
        profile.hasMatchedGoal = true
        profile.save()
    }
}
