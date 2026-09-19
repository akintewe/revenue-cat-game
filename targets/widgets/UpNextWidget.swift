import SwiftUI
import WidgetKit

struct UpNextEntry: TimelineEntry {
  let date: Date
  let items: [UpNextItem]
  let backlogCount: Int
}

/// No timeline needed: the content changes only when the app publishes, and that reloads us.
struct UpNextProvider: TimelineProvider {
  func placeholder(in context: Context) -> UpNextEntry { UpNextEntry(date: .now, items: [.sample], backlogCount: 0) }

  func getSnapshot(in context: Context, completion: @escaping (UpNextEntry) -> Void) {
    let entry = Self.current()
    completion(entry.items.isEmpty && context.isPreview ? UpNextEntry(date: .now, items: [.sample], backlogCount: 0) : entry)
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<UpNextEntry>) -> Void) {
    completion(Timeline(entries: [Self.current()], policy: .never))
  }

  static func current() -> UpNextEntry {
    let section = SnapshotStore.load()?.upNext
    return UpNextEntry(date: .now, items: section?.items ?? [], backlogCount: section?.backlogCount ?? 0)
  }
}

extension UpNextItem {
  static let sample = UpNextItem(
    catalogId: "sample", title: "Elden Ring", progress: 0.52, summary: "31h · about halfway",
    detail: "31h played · about 60h to beat", coverFile: nil, bleed: "#3D6B4F"
  )
}

struct UpNextWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "UpNextWidget", provider: UpNextProvider()) { entry in
      UpNextView(entry: entry).containerBackground(.black, for: .widget)
    }
    .configurationDisplayName("Up next")
    .description("The game you are playing, and how far along you are.")
    .supportedFamilies([.systemSmall, .systemMedium])
    .contentMarginsDisabled()
  }
}

struct UpNextView: View {
  @Environment(\.widgetFamily) private var family
  let entry: UpNextEntry

  var body: some View {
    if let hero = entry.items.first {
      Group {
        if family == .systemMedium { UpNextMedium(item: hero) } else { UpNextSmall(item: hero) }
      }
      .widgetURL(WidgetLink.url("game", id: hero.catalogId))
    } else {
      UpNextEmpty(backlogCount: entry.backlogCount).widgetURL(WidgetLink.url("library"))
    }
  }
}

/// Small: full-bleed cover, because here the game is the message.
struct UpNextSmall: View {
  let item: UpNextItem

  var body: some View {
    ZStack(alignment: .bottomLeading) {
      FullBleedCover(item: item)
      VStack(alignment: .leading, spacing: 1) {
        Text("Playing").font(.system(size: 12, weight: .semibold)).foregroundStyle(Theme.accent)
        Text(item.title).font(.system(size: 15, weight: .semibold)).foregroundStyle(Theme.ink).lineLimit(2)
        Text(item.summary).font(.system(size: 12)).foregroundStyle(Theme.ink2).lineLimit(1)
      }
      .padding(Theme.padding)
    }
  }
}

struct UpNextMedium: View {
  let item: UpNextItem

  var body: some View {
    ZStack {
      Bleed(color: Color(hex: item.bleed), center: UnitPoint(x: 0.15, y: 0.5), reach: 0.6)
      HStack(spacing: 14) {
        CoverView(item: item, width: 96, radius: 10)
        VStack(alignment: .leading, spacing: 6) {
          Text("Playing").font(.system(size: 12, weight: .semibold)).foregroundStyle(Theme.accent)
          Text(item.title).font(.system(size: 19, weight: .semibold)).foregroundStyle(Theme.ink).lineLimit(2).minimumScaleFactor(0.85)
          Text(item.detail).font(.system(size: 12)).foregroundStyle(Theme.ink2).lineLimit(1).minimumScaleFactor(0.85)
          if let progress = item.progress {
            HStack(spacing: 12) {
              ProgressRing(progress: progress)
              Pill(text: "Update hours", quiet: true)
            }
            .padding(.top, 4)
          }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      }
      .padding(Theme.padding)
    }
  }
}

struct ProgressRing: View {
  let progress: Double

  var body: some View {
    ZStack {
      Circle().stroke(Color.white.opacity(0.14), lineWidth: 4)
      Circle().trim(from: 0, to: max(progress, 0.02))
        .stroke(Theme.accent, style: StrokeStyle(lineWidth: 4, lineCap: .round))
        .rotationEffect(.degrees(-90))
      Text("\(Int((progress * 100).rounded()))%").font(.system(size: 11, weight: .bold)).foregroundStyle(Theme.ink)
    }
    .frame(width: 44, height: 44)
  }
}

struct UpNextEmpty: View {
  let backlogCount: Int

  var body: some View {
    ZStack(alignment: .bottomLeading) {
      GeometryReader { geo in
        Image("controller").resizable().scaledToFit()
          .frame(width: 150)
          .rotationEffect(.degrees(-10))
          .position(x: geo.size.width - 45, y: 62)
      }
      VStack(alignment: .leading, spacing: 1) {
        Text("Nothing in play").font(.system(size: 15, weight: .semibold)).foregroundStyle(Theme.ink)
        Text(backlogCount > 0 ? "Pick from \(backlogCount) in your backlog" : "Add a game to start")
          .font(.system(size: 12)).foregroundStyle(Theme.ink2)
      }
      .padding(Theme.padding)
    }
  }
}
