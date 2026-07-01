import Foundation

@MainActor
final class Auth: ObservableObject {
    @Published var session: Supabase.Session?
    @Published var demoMode = false

    private let sessionKey = "pomoleague.session.v1"
    private let demoKey = "pomoleague.demoMode.v1"

    var isAuthed: Bool { session != nil || demoMode }
    var isConfigured: Bool { Secrets.isConfigured }

    init() {
        if let data = UserDefaults.standard.data(forKey: sessionKey),
           let s = try? JSONDecoder().decode(Supabase.Session.self, from: data) {
            session = s
        }
        demoMode = UserDefaults.standard.bool(forKey: demoKey)
    }

    func enterDemo() {
        demoMode = true
        UserDefaults.standard.set(true, forKey: demoKey)
    }

    func sendOTP(email: String) async throws {
        try await Supabase.shared.sendOTP(email: email)
    }

    func verifyOTP(email: String, token: String) async throws {
        setSession(try await Supabase.shared.verifyOTP(email: email, token: token))
    }

    private func setSession(_ s: Supabase.Session) {
        session = s
        if let data = try? JSONEncoder().encode(s) {
            UserDefaults.standard.set(data, forKey: sessionKey)
        }
    }

    /// Run an authenticated Supabase call, transparently refreshing the session
    /// once if the access token has expired (HTTP 401). Signs out if the refresh
    /// itself fails (e.g. the refresh token is revoked).
    func withValidSession<T>(_ work: (Supabase.Session) async throws -> T) async throws -> T {
        guard let s = session else { throw Supabase.SupaError.notConfigured }
        do {
            return try await work(s)
        } catch Supabase.SupaError.http(401, _) {
            do {
                let refreshed = try await Supabase.shared.refreshSession(refreshToken: s.refreshToken)
                setSession(refreshed)
                return try await work(refreshed)
            } catch {
                signOut()
                throw error
            }
        }
    }

    func signOut() {
        session = nil
        demoMode = false
        UserDefaults.standard.removeObject(forKey: sessionKey)
        UserDefaults.standard.removeObject(forKey: demoKey)
    }
}
