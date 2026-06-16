import Foundation

/// Fill these in to enable real accounts + the real league. Leave blank to run
/// fully offline (demo mode). Get them from your Supabase project:
/// Project Settings → API → Project URL + anon public key.
enum Secrets {
    static let supabaseURL = "" // e.g. "https://abcd.supabase.co"
    static let supabaseAnonKey = ""

    static var isConfigured: Bool {
        !supabaseURL.isEmpty && !supabaseAnonKey.isEmpty
    }
}
