import AppIntents
import Foundation
import WidgetKit

/// The pick and the day's roll count. The widget owns this state; the app never writes it.
struct RouletteState: Codable {
  var pickId: String?
  var rollDay: String
  var rollsToday: Int
}

/// Mirrors src/features/widgets/snapshot/roll.ts line for line. Change both together.
enum Roulette {
  static let key = "widgetRoulette"

  static func today(_ date: Date = .now) -> String {
    let parts = Calendar.current.dateComponents([.year, .month, .day], from: date)
    return String(format: "%04d-%02d-%02d", parts.year ?? 0, parts.month ?? 0, parts.day ?? 0)
  }

  static func load() -> RouletteState? {
    guard
      let json = UserDefaults(suiteName: SnapshotStore.appGroup)?.string(forKey: key),
      let data = json.data(using: .utf8)
    else { return nil }
    return try? JSONDecoder().decode(RouletteState.self, from: data)
  }

  static func save(_ state: RouletteState) {
    guard let data = try? JSONEncoder().encode(state), let json = String(data: data, encoding: .utf8) else { return }
    UserDefaults(suiteName: SnapshotStore.appGroup)?.set(json, forKey: key)
  }

  static func canRoll(_ state: RouletteState?, isPlus: Bool, freePerDay: Int, today: String) -> Bool {
    if isPlus { return true }
    let used = state?.rollDay == today ? (state?.rollsToday ?? 0) : 0
    return used < freePerDay
  }

  static func roll(_ poolIds: [String], state: RouletteState?, today: String) -> RouletteState {
    let used = state?.rollDay == today ? (state?.rollsToday ?? 0) : 0
    guard !poolIds.isEmpty else { return RouletteState(pickId: nil, rollDay: today, rollsToday: used) }
    let choices = poolIds.count > 1 ? poolIds.filter { $0 != state?.pickId } : poolIds
    return RouletteState(pickId: choices.randomElement(), rollDay: today, rollsToday: used + 1)
  }
}

/// Runs in the widget process when the Roll button is tapped. The app does not open.
struct RollIntent: AppIntent {
  static var title: LocalizedStringResource = "Roll the backlog"
  static var description = IntentDescription("Picks a game from your backlog.")

  func perform() async throws -> some IntentResult {
    guard let snapshot = SnapshotStore.load(), let section = snapshot.roulette else { return .result() }
    let today = Roulette.today()
    let state = Roulette.load()
    guard Roulette.canRoll(state, isPlus: snapshot.isPlus, freePerDay: section.freeRollsPerDay, today: today) else {
      return .result()
    }
    Roulette.save(Roulette.roll(section.pool.map(\.catalogId), state: state, today: today))
    return .result()
  }
}
