import SwiftUI

@main
struct PomoLeagueApp: App {
    @StateObject private var auth = Auth()
    @StateObject private var ledger = Ledger()
    @StateObject private var profile = ProfileStore()
    @StateObject private var tasks = TaskStore()
    @StateObject private var partner = PartnerStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(auth)
                .environmentObject(ledger)
                .environmentObject(profile)
                .environmentObject(tasks)
                .environmentObject(partner)
                .tint(.pomoTomato)
        }
    }
}

struct RootView: View {
    @EnvironmentObject var auth: Auth
    @EnvironmentObject var profile: ProfileStore

    var body: some View {
        Group {
            if !profile.seenIntro {
                OnboardingCarouselView()
            } else if !auth.isAuthed {
                SignInView()
            } else if profile.displayName.isEmpty {
                OnboardingView()
            } else if !profile.hasPickedGoal {
                GoalPickerView()
            } else {
                MainTabView()
            }
        }
    }
}

struct MainTabView: View {
    var body: some View {
        TabView {
            HomeView().tabItem { Label("Home", systemImage: "house.fill") }
            PartnerView().tabItem { Label("Partner", systemImage: "person.2.fill") }
            LeagueView().tabItem { Label("League", systemImage: "trophy.fill") }
            StatsView().tabItem { Label("Stats", systemImage: "chart.bar.fill") }
            ProfileView().tabItem { Label("Profile", systemImage: "person.fill") }
        }
    }
}
