import SwiftUI

struct SignInView: View {
    @EnvironmentObject var auth: Auth
    @State private var email = ""
    @State private var code = ""
    @State private var stage: Stage = .email
    @State private var busy = false
    @State private var error: String?

    enum Stage { case email, code }

    var body: some View {
        VStack(spacing: 14) {
            Spacer()
            Text("PomoLeague").font(.system(size: 38, weight: .heavy)).foregroundStyle(Color.pomoTomato)
            Text("Study, scored as a sport.").foregroundStyle(Color.pomoSubtle)
                .padding(.bottom, 16)

            if !auth.isConfigured {
                Text("Supabase isn't configured — fill Secrets.swift, or just explore below.")
                    .font(.footnote).foregroundStyle(Color.pomoTomatoDark)
                    .multilineTextAlignment(.center)
            }

            if stage == .email {
                TextField("you@school.edu", text: $email)
                    .textInputAutocapitalization(.never)
                    .keyboardType(.emailAddress)
                    .textFieldStyle(.roundedBorder)
                primaryButton("Send me a code", action: send)
            } else {
                Text("We emailed a 6-digit code to \(email).").font(.footnote).foregroundStyle(Color.pomoSubtle)
                TextField("123456", text: $code)
                    .keyboardType(.numberPad)
                    .textFieldStyle(.roundedBorder)
                primaryButton("Verify", action: verify)
                Button("Use a different email") { stage = .email }
                    .font(.footnote).foregroundStyle(Color.pomoSubtle)
            }

            if let error { Text(error).font(.footnote).foregroundStyle(.red) }

            Text("— or —").foregroundStyle(Color.pomoSubtle).padding(.top, 10)
            Button(action: auth.enterDemo) {
                Text("Explore the app (no account)")
                    .font(.headline).foregroundStyle(Color.pomoInk)
                    .frame(maxWidth: .infinity).padding()
                    .background(RoundedRectangle(cornerRadius: 12).stroke(Color.pomoLine))
            }
            Spacer()
        }
        .padding(24)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.pomoBg.ignoresSafeArea())
    }

    private func primaryButton(_ title: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Group {
                if busy { ProgressView().tint(.white) } else { Text(title).font(.headline) }
            }
            .foregroundStyle(.white).frame(maxWidth: .infinity).padding()
            .background(RoundedRectangle(cornerRadius: 12).fill(Color.pomoTomato))
        }
        .disabled(busy)
    }

    private func send() {
        error = nil; busy = true
        Task {
            do { try await auth.sendOTP(email: email); stage = .code }
            catch { self.error = "Could not send code." }
            busy = false
        }
    }

    private func verify() {
        error = nil; busy = true
        Task {
            do { try await auth.verifyOTP(email: email, token: code) }
            catch { self.error = "Invalid code." }
            busy = false
        }
    }
}
