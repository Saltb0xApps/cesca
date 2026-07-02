import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var profile: ProfileStore
    @EnvironmentObject var auth: Auth
    @EnvironmentObject var ledger: Ledger
    @Environment(\.dismiss) private var dismiss

    @State private var confirmReset = false
    @State private var confirmSignOut = false

    var body: some View {
        ZStack {
            Color(red: 0.980, green: 0.969, blue: 0.957).ignoresSafeArea() // #faf7f4

            VStack(spacing: 0) {
                // Header
                HStack {
                    Button { dismiss() } label: {
                        Image(systemName: "arrow.left")
                            .font(.system(size: 18, weight: .medium))
                            .foregroundStyle(Color.pomoRed)
                            .frame(width: 24, height: 24)
                    }
                    Spacer()
                    Text("SETTINGS.")
                        .font(.marker(32))
                        .foregroundStyle(Color.pomoRed)
                }
                .padding(.horizontal, 24)
                .padding(.top, 56)
                .padding(.bottom, 20)

                ScrollView {
                    VStack(spacing: 20) {
                        settingsSection("timer") {
                            StepperRow(label: "focus duration", value: $profile.focusDuration, range: 5...60, unit: "min") { profile.save() }
                            Divider().overlay(Color.pomoRed.opacity(0.15))
                            StepperRow(label: "short break", value: $profile.shortBreak, range: 1...30, unit: "min") { profile.save() }
                            Divider().overlay(Color.pomoRed.opacity(0.15))
                            StepperRow(label: "long break", value: $profile.longBreak, range: 5...60, unit: "min") { profile.save() }
                        }

                        settingsSection("session") {
                            ToggleRow(label: "auto-start break", isOn: $profile.autoStartBreak) { profile.save() }
                            Divider().overlay(Color.pomoRed.opacity(0.15))
                            VStack(alignment: .leading, spacing: 2) {
                                ToggleRow(label: "strict mode", isOn: $profile.strictMode) { profile.save() }
                                Text("leave the app and you lose")
                                    .font(.caveat(13))
                                    .foregroundStyle(Color.pomoRedFaded)
                                    .padding(.leading, 0)
                            }
                        }

                        settingsSection("notifications") {
                            ToggleRow(label: "round complete", isOn: $profile.notifyRoundComplete) { profile.save() }
                            Divider().overlay(Color.pomoRed.opacity(0.15))
                            HStack {
                                Text("daily reminder")
                                    .font(.caveatBold(18))
                                    .foregroundStyle(Color.pomoRed)
                                Spacer()
                                HStack(spacing: 12) {
                                    Text("08:00")
                                        .font(.marker(16))
                                        .foregroundStyle(Color.pomoRedFaded)
                                    sketchToggle($profile.notifyDailyReminder) { profile.save() }
                                }
                            }
                        }

                        settingsSection("account") {
                            HStack {
                                Text("email")
                                    .font(.caveatBold(18))
                                    .foregroundStyle(Color.pomoRed)
                                Spacer()
                                HStack(spacing: 4) {
                                    Text(auth.isAuthed ? "signed in" : "not signed in")
                                        .font(.caveat(16))
                                        .foregroundStyle(Color.pomoRedFaded)
                                        .lineLimit(1)
                                    Image(systemName: "chevron.right")
                                        .font(.system(size: 11, weight: .semibold))
                                        .foregroundStyle(Color.pomoRedFaded)
                                }
                            }
                            Divider().overlay(Color.pomoRed.opacity(0.15))
                            VStack(alignment: .leading, spacing: 16) {
                                Button("sign out") { confirmSignOut = true }
                                    .font(.caveatBold(18))
                                    .foregroundStyle(Color.pomoRed)
                                Button("reset pomo history") { confirmReset = true }
                                    .font(.caveatBold(18))
                                    .foregroundStyle(Color.pomoRedFaded)
                                    .underline()
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                        }
                    }
                    .padding(.horizontal, 24)
                    .padding(.bottom, 40)
                }
            }
        }
        .alert("Sign out?", isPresented: $confirmSignOut) {
            Button("Sign out", role: .destructive) { auth.signOut() }
            Button("Cancel", role: .cancel) {}
        }
        .alert("Reset pomo history?", isPresented: $confirmReset) {
            Button("Reset", role: .destructive) { ledger.clear() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This clears all your pomos locally. It can't be undone.")
        }
    }

    // MARK: - Helpers

    private func settingsSection<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title.uppercased())
                .font(.caveatBold(14))
                .foregroundStyle(Color.pomoRedFaded)
                .tracking(1.2)
                .padding(.leading, 4)

            VStack(alignment: .leading, spacing: 16) {
                content()
            }
            .padding(16)
            .background(Color.white)
            .overlay(RoundedRectangle(cornerRadius: 4).stroke(Color.pomoRed, lineWidth: 1.5))
            .cornerRadius(4)
        }
    }

    private func sketchToggle(_ isOn: Binding<Bool>, onChange: @escaping () -> Void) -> some View {
        Toggle("", isOn: isOn)
            .labelsHidden()
            .toggleStyle(SketchToggleStyle())
            .onChange(of: isOn.wrappedValue) { _, _ in onChange() }
    }
}

// MARK: - Row Components

private struct StepperRow: View {
    let label: String
    @Binding var value: Int
    let range: ClosedRange<Int>
    let unit: String
    let onChange: () -> Void

    var body: some View {
        HStack {
            Text(label)
                .font(.caveatBold(18))
                .foregroundStyle(Color.pomoRed)
            Spacer()
            HStack(spacing: 12) {
                Button {
                    if value > range.lowerBound { value -= 1; onChange() }
                } label: {
                    Text("−")
                        .font(.marker(18))
                        .foregroundStyle(Color.pomoRed)
                        .frame(width: 28, height: 28)
                        .overlay(RoundedRectangle(cornerRadius: 4).stroke(Color.pomoRed, lineWidth: 1.5))
                }

                Text("\(value) \(unit)")
                    .font(.marker(20))
                    .foregroundStyle(Color.pomoRed)
                    .frame(minWidth: 60, alignment: .center)

                Button {
                    if value < range.upperBound { value += 1; onChange() }
                } label: {
                    Text("+")
                        .font(.marker(18))
                        .foregroundStyle(.white)
                        .frame(width: 28, height: 28)
                        .background(RoundedRectangle(cornerRadius: 4).fill(Color.pomoRed))
                }
            }
        }
    }
}

private struct ToggleRow: View {
    let label: String
    @Binding var isOn: Bool
    let onChange: () -> Void

    var body: some View {
        HStack {
            Text(label)
                .font(.caveatBold(18))
                .foregroundStyle(Color.pomoRed)
            Spacer()
            Toggle("", isOn: $isOn)
                .labelsHidden()
                .toggleStyle(SketchToggleStyle())
                .onChange(of: isOn) { _, _ in onChange() }
        }
    }
}

// Sketch-style toggle that matches the Figma design
private struct SketchToggleStyle: ToggleStyle {
    func makeBody(configuration: Configuration) -> some View {
        let on = configuration.isOn
        RoundedRectangle(cornerRadius: 10)
            .fill(on ? Color.pomoRed : Color.pomoRed.opacity(0.18))
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(Color.pomoRed, lineWidth: 1)
            )
            .frame(width: 36, height: 20)
            .overlay(
                Circle()
                    .fill(.white)
                    .frame(width: 14, height: 14)
                    .offset(x: on ? 8 : -8)
                    .animation(.easeInOut(duration: 0.15), value: on)
            )
            .onTapGesture { configuration.isOn.toggle() }
    }
}
