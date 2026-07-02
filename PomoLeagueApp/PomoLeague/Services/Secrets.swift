import Foundation

/// Fill these in to enable real accounts + the real league. Leave blank to run
/// fully offline (demo mode). Get them from your Supabase project:
/// Project Settings → API → Project URL + anon public key.
enum Secrets {
    static let supabaseURL = "https://wgwpjpjptrgoiawbzqvp.supabase.co"
    static let supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indnd3BqcGpwdHJnb2lhd2J6cXZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4NzMzNTUsImV4cCI6MjA5ODQ0OTM1NX0.IMHY2QaOmWjn-XEJhdexXpx5yIf6ijmRRAz_AJdlNJ4"

    static var isConfigured: Bool {
        !supabaseURL.isEmpty && !supabaseAnonKey.isEmpty
    }
}
