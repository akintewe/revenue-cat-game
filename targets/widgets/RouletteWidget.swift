import AppIntents
import SwiftUI
import WidgetKit

struct RouletteEntry: TimelineEntry {
  let date: Date
  let poolCount: Int
  let pick: RouletteItem?
  let canRoll: Bool
  /// Changes the die's pose after each roll. A widget cannot animate a spin.
  let pose: Int
}

struct RouletteProvider: TimelineProvider {
  func placeholder(in context: Context) -> RouletteEntry { RouletteEntry(date: .now, poolCount: 1, pick: nil, canRoll: true, pose: 0) }

  func getSnapshot(in context: Context, completion: @escaping (RouletteEntry) -> Void) {
    let entry = Self.current()
    completion(entry.poolCount == 0 && context.isPreview ? RouletteEntry(date: .now, poolCount: 1, pick: nil, canRoll: true, pose: 0) : entry)
  }

  /// A second entry at midnight gives the free tier its roll back without the app running.
  func getTimeline(in context: Context, completion: @escaping (Timeline<RouletteEntry>) -> Void) {
    let calendar = Calendar.current
    let midnight = calendar.date(byAdding: .day, value: 1, to: calendar.startOfDay(for: .now)) ?? .now.addingTimeInterval(86_400)
    completion(Timeline(entries: [Self.current(at: .now), Self.current(at: midnight)], policy: .atEnd))
  }

  static func current(at date: Date = .now) -> RouletteEntry {
    let snapshot = SnapshotStore.load()
    let pool = snapshot?.roulette?.pool ?? []
    let state = Roulette.load()
    let canRoll = Roulette.canRoll(
      state, isPlus: snapshot?.isPlus ?? false, freePerDay: snapshot?.roulette?.freeRollsPerDay ?? 1, today: Roulette.today(date)
    )
    // A pick that left the backlog (started, removed) is no longer a pick.
    let pick = pool.first { $0.catalogId == state?.pickId }
    return RouletteEntry(date: date, poolCount: pool.count, pick: pick, canRoll: canRoll, pose: state?.rollsToday ?? 0)
  }
}

struct RouletteWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "RouletteWidget", provider: RouletteProvider()) { entry in
      RouletteView(entry: entry).containerBackground(.black, for: .widget)
    }
    .configurationDisplayName("Roll the backlog")
    .description("One tap picks tonight's game from your backlog.")
    .supportedFamilies([.systemSmall, .systemMedium])
    .contentMarginsDisabled()
  }
}

struct Die: View {
  let pose: Int
  var body: some View {
    Image("d20").resizable().scaledToFit().rotationEffect(.degrees(Double((pose * 47) % 360)))
  }
}

/// Roll when allowed; the paywall when the free roll is used up.
struct RollButton: View {
  let title: String
  let canRoll: Bool
  var quiet = false

  var body: some View {
    if canRoll {
      Button(intent: RollIntent()) { Pill(text: title, quiet: quiet) }.buttonStyle(.plain)
    } else if let url = WidgetLink.url("paywall") {
      Link(destination: url) { Pill(text: "Unlock rolls", quiet: quiet) }
    }
  }
}

struct RouletteView: View {
  @Environment(\.widgetFamily) private var family
  let entry: RouletteEntry

  var body: some View {
    if entry.poolCount == 0 {
      RouletteEmpty().widgetURL(WidgetLink.url("library"))
    } else if family == .systemMedium {
      RouletteMedium(entry: entry).widgetURL(entry.pick.flatMap { WidgetLink.url("game", id: $0.catalogId) })
    } else {
      RouletteSmall(entry: entry).widgetURL(entry.pick.flatMap { WidgetLink.url("game", id: $0.catalogId) })
    }
  }
}

struct RouletteSmall: View {
  let entry: RouletteEntry

  var body: some View {
    if let pick = entry.pick {
      ZStack(alignment: .bottomLeading) {
        FullBleedCover(item: pick)
        VStack(alignment: .leading, spacing: 1) {
          Text("Tonight you play").font(.system(size: 12, weight: .semibold)).foregroundStyle(Theme.accent)
          Text(pick.title).font(.system(size: 15, weight: .semibold)).foregroundStyle(Theme.ink).lineLimit(2)
        }
        .padding(Theme.padding)
        if entry.canRoll {
          Button(intent: RollIntent()) {
            Die(pose: entry.pose).frame(width: 40, height: 40).shadow(color: .black.opacity(0.6), radius: 6)
          }
          .buttonStyle(.plain)
          .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
          .padding(10)
        }
      }
    } else {
      ZStack(alignment: .bottom) {
        Die(pose: entry.pose).frame(width: 132).frame(maxHeight: .infinity, alignment: .top).padding(.top, 8)
        RollButton(title: "Roll", canRoll: entry.canRoll).padding(.bottom, Theme.padding)
      }
      .frame(maxWidth: .infinity)
    }
  }
}

struct RouletteMedium: View {
  let entry: RouletteEntry

  var body: some View {
    ZStack(alignment: .leading) {
      if let pick = entry.pick {
        Bleed(color: Color(hex: pick.bleed), center: UnitPoint(x: 0.85, y: 0.5), reach: 0.6)
      }
      Die(pose: entry.pose).frame(width: 110).rotationEffect(.degrees(14)).offset(x: -18)
      HStack(spacing: 14) {
        VStack(alignment: .leading, spacing: 6) {
          if let pick = entry.pick {
            Text("Tonight you play").font(.system(size: 12, weight: .semibold)).foregroundStyle(Theme.accent)
            Text(pick.title).font(.system(size: 19, weight: .semibold)).foregroundStyle(Theme.ink).lineLimit(1).minimumScaleFactor(0.8)
            Text(pick.detail).font(.system(size: 12)).foregroundStyle(Theme.ink2).lineLimit(2)
            HStack(spacing: 8) {
              RollButton(title: "Roll again", canRoll: entry.canRoll, quiet: true)
              if let url = WidgetLink.url("start", id: pick.catalogId) {
                Link(destination: url) { Pill(text: "Start") }
              }
            }
            .padding(.top, 4)
          } else {
            Text("Roll the backlog").font(.system(size: 12, weight: .semibold)).foregroundStyle(Theme.accent)
            Text("What do you play tonight?").font(.system(size: 19, weight: .semibold)).foregroundStyle(Theme.ink).lineLimit(2)
            Text("\(entry.poolCount) \(entry.poolCount == 1 ? "game" : "games") waiting").font(.system(size: 12)).foregroundStyle(Theme.ink2)
            RollButton(title: "Roll", canRoll: entry.canRoll).padding(.top, 4)
          }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        if let pick = entry.pick { CoverView(item: pick, width: 64) }
      }
      .padding(Theme.padding)
      .padding(.leading, 88)
    }
  }
}

struct RouletteEmpty: View {
  var body: some View {
    ZStack(alignment: .bottomLeading) {
      Die(pose: 0).frame(width: 110).opacity(0.5).frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing).padding(8)
      VStack(alignment: .leading, spacing: 1) {
        Text("Your backlog is empty").font(.system(size: 15, weight: .semibold)).foregroundStyle(Theme.ink)
        Text("Add games to roll for one").font(.system(size: 12)).foregroundStyle(Theme.ink2)
      }
      .padding(Theme.padding)
    }
  }
}
