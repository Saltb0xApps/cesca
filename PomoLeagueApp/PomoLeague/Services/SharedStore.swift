import Foundation
#if canImport(WidgetKit)
import WidgetKit
#endif

/// Shares today's progress with the home-screen widget via an App Group.
/// Requires the App Group `group.com.cesca.pomoleague` to be enabled on both the
/// app and the widget target (see WIDGET_SETUP.md). Degrades to standard
/// defaults if the group isn't configured yet.
enum SharedStore {
    static let suiteName = "group.com.cesca.pomoleague"

    private static var defaults: UserDefaults {
        UserDefaults(suiteName: suiteName) ?? .standard
    }

    static func sync(today: Int, goal: Int) {
        defaults.set(today, forKey: "today")
        defaults.set(goal, forKey: "goal")
        #if canImport(WidgetKit)
        WidgetCenter.shared.reloadAllTimelines()
        #endif
    }

    static func read() -> (today: Int, goal: Int) {
        (defaults.integer(forKey: "today"), max(1, defaults.integer(forKey: "goal")))
    }
}
