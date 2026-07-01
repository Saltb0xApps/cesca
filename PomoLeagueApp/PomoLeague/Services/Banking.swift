import Foundation

/// Banks a completed pomo: always to the local ledger; also to Supabase when
/// signed in (updating the real league).
@MainActor
enum Banking {
    static func bankPomo(ledger: Ledger, auth: Auth, chainIndex: Int, task: String?) {
        ledger.bankLocal(chainIndex: chainIndex, task: task)

        guard Secrets.isConfigured, let session = auth.session else { return }
        Task {
            do {
                try await Supabase.shared.rpc(
                    "bank_pomo",
                    params: ["p_task": task ?? NSNull(), "p_chain_index": chainIndex],
                    session: session
                )
            } catch {
                print("[bank_pomo] failed: \(error)")
            }
        }
    }

    /// Server half of the phone penalty: delete today's rounds + reset streak.
    static func applyPenalty(auth: Auth) {
        guard Secrets.isConfigured, let session = auth.session else { return }
        Task {
            do { try await Supabase.shared.rpc("apply_penalty", params: [:], session: session) }
            catch { print("[apply_penalty] failed: \(error)") }
        }
    }

    /// Sync the daily goal to the server (used by the partner evaluation).
    static func setDailyGoal(auth: Auth, goal: Int) {
        guard Secrets.isConfigured, let session = auth.session else { return }
        Task {
            do { try await Supabase.shared.rpc("set_daily_goal", params: ["g": goal], session: session) }
            catch { print("[set_daily_goal] failed: \(error)") }
        }
    }
}
