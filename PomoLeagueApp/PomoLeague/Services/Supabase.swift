import Foundation

/// Minimal Supabase REST client over URLSession — covers email-OTP auth and the
/// RPCs we need (bank_pomo, league_standings). No third-party package required.
struct Supabase {
    struct Session: Codable {
        var accessToken: String
        var userId: String
    }

    enum SupaError: Error { case notConfigured, http(Int, String), decode }

    static let shared = Supabase()

    private var base: String { Secrets.supabaseURL }
    private var anon: String { Secrets.supabaseAnonKey }

    // MARK: Auth

    func sendOTP(email: String) async throws {
        try await post(path: "/auth/v1/otp", body: ["email": email], accessToken: nil)
    }

    func verifyOTP(email: String, token: String) async throws -> Session {
        let data = try await post(
            path: "/auth/v1/verify",
            body: ["type": "email", "email": email, "token": token],
            accessToken: nil
        )
        let obj = try JSONSerialization.jsonObject(with: data)
        guard
            let json = obj as? [String: Any],
            let access = json["access_token"] as? String,
            let user = json["user"] as? [String: Any],
            let uid = user["id"] as? String
        else { throw SupaError.decode }
        return Session(accessToken: access, userId: uid)
    }

    // MARK: Profiles

    func upsertProfile(session: Session, displayName: String, avatar: String, examTag: String?) async throws {
        let tz = TimeZone.current.identifier
        var body: [String: Any] = [
            "id": session.userId,
            "display_name": displayName,
            "avatar": avatar,
            "timezone": tz,
        ]
        body["exam_tag"] = (examTag?.isEmpty == false) ? examTag! : NSNull()
        try await post(
            path: "/rest/v1/profiles?on_conflict=id",
            body: body,
            accessToken: session.accessToken,
            extraHeaders: ["Prefer": "resolution=merge-duplicates"]
        )
    }

    // MARK: RPCs

    @discardableResult
    func rpc(_ name: String, params: [String: Any], session: Session) async throws -> Data {
        try await post(path: "/rest/v1/rpc/\(name)", body: params, accessToken: session.accessToken)
    }

    func leagueStandings(session: Session) async throws -> [StandingRow] {
        let data = try await rpc("league_standings", params: [:], session: session)
        return (try? JSONDecoder().decode([StandingRow].self, from: data)) ?? []
    }

    struct StandingRow: Codable {
        var user_id: String
        var display_name: String
        var avatar: String?
        var pomos: Int
        var is_you: Bool
    }

    // MARK: Partner RPCs

    struct PartnerSummary: Codable {
        var active: Bool
        var invite_code: String?
        var partner_name: String?
        var partner_avatar: String?
        var partner_today: Int?
        var partner_goal: Int?
        var you_today: Int
        var you_goal: Int
        var team_streak: Int
    }

    struct SettleResult: Codable {
        var lost: Bool
        var team_streak: Int
    }

    func createPartnerInvite(session: Session) async throws -> String {
        let data = try await rpc("create_partner_invite", params: [:], session: session)
        if let s = try? JSONDecoder().decode(String.self, from: data) { return s }
        return (String(data: data, encoding: .utf8) ?? "")
            .trimmingCharacters(in: CharacterSet(charactersIn: "\"\n "))
    }

    func acceptPartnerInvite(_ code: String, session: Session) async throws {
        try await rpc("accept_partner_invite", params: ["code": code], session: session)
    }

    func partnerSummary(session: Session) async throws -> PartnerSummary? {
        let data = try await rpc("partner_summary", params: [:], session: session)
        return (try? JSONDecoder().decode([PartnerSummary].self, from: data))?.first
    }

    func settlePartnerDays(session: Session) async throws -> SettleResult? {
        let data = try await rpc("settle_partner_days", params: [:], session: session)
        return (try? JSONDecoder().decode([SettleResult].self, from: data))?.first
    }

    // MARK: Plumbing

    @discardableResult
    private func post(path: String, body: [String: Any], accessToken: String?,
                      extraHeaders: [String: String] = [:]) async throws -> Data {
        guard Secrets.isConfigured, let url = URL(string: base + path) else { throw SupaError.notConfigured }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue(anon, forHTTPHeaderField: "apikey")
        req.setValue("Bearer \(accessToken ?? anon)", forHTTPHeaderField: "Authorization")
        for (k, v) in extraHeaders { req.setValue(v, forHTTPHeaderField: k) }
        req.httpBody = try JSONSerialization.data(withJSONObject: body, options: [])

        let (data, resp) = try await URLSession.shared.data(for: req)
        let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(code) else {
            throw SupaError.http(code, String(data: data, encoding: .utf8) ?? "")
        }
        return data
    }
}
