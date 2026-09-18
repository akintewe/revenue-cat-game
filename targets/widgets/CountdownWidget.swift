import SwiftUI
import WidgetKit

// MARK: Timeline

struct CountdownEntry: TimelineEntry {
  let date: Date
  /// Games that are not out yet on `date`, soonest first.
  let items: [CountdownItem]
}

struct CountdownProvider: TimelineProvider {
  func placeholder(in context: Context) -> CountdownEntry {
    CountdownEntry(date: .now, items: [.sample])
  }

  func getSnapshot(in context: Context, completion: @escaping (CountdownEntry) -> Void) {
    let items = Self.items(on: .now)
    completion(CountdownEntry(date: .now, items: items.isEmpty && context.isPreview ? [.sample] : items))
  }

  /// One entry per local midnight, so the number drops without the app running. The app also
  /// reloads the timeline each time it publishes a snapshot.
  func getTimeline(in context: Context, completion: @escaping (Timeline<CountdownEntry>) -> Void) {
    let calendar = Calendar.current
    let today = calendar.startOfDay(for: .now)
    let entries = (0..<14).compactMap { offset -> CountdownEntry? in
      guard let day = calendar.date(byAdding: .day, value: offset, to: today) else { return nil }
      let date = offset == 0 ? Date.now : day
      return CountdownEntry(date: date, items: Self.items(on: date))
    }
    completion(Timeline(entries: entries, policy: .atEnd))
  }

  static func items(on date: Date) -> [CountdownItem] {
    (SnapshotStore.load()?.countdown.items ?? []).filter {
      (ReleaseDate.daysUntil($0.releaseDate, from: date) ?? -1) >= 0
    }
  }
}

extension CountdownItem {
  static let sample = CountdownItem(
    catalogId: "sample", title: "Hollow Knight: Silksong", shortTitle: "Silksong",
    releaseDate: "2099-01-01", coverFile: nil, bleed: "#D46947"
  )

  func days(from date: Date) -> Int { max(ReleaseDate.daysUntil(releaseDate, from: date) ?? 0, 0) }
  var link: URL? { URL(string: "prysm://game/\(catalogId.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? catalogId)") }
}

// MARK: Widget

struct CountdownWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "CountdownWidget", provider: CountdownProvider()) { entry in
      CountdownView(entry: entry)
        .containerBackground(.black, for: .widget)
    }
    .configurationDisplayName("Release countdown")
    .description("Days until the next game on your wishlist.")
    .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular, .accessoryCircular, .accessoryInline])
    // The glass object and the fanned covers break the card edge, so the widget pads itself.
    .contentMarginsDisabled()
  }
}

struct CountdownView: View {
  @Environment(\.widgetFamily) private var family
  let entry: CountdownEntry

  var body: some View {
    if let hero = entry.items.first {
      Group {
        switch family {
        case .systemMedium: CountdownMedium(hero: hero, rest: Array(entry.items.dropFirst().prefix(2)), date: entry.date)
        case .accessoryRectangular: CountdownRectangular(item: hero, date: entry.date)
        case .accessoryCircular: CountdownCircular(item: hero, date: entry.date)
        case .accessoryInline: Text(hero.days(from: entry.date) == 0 ? "\(hero.shortTitle) is out" : "\(hero.shortTitle) in \(hero.days(from: entry.date))d")
        default: CountdownSmall(item: hero, date: entry.date)
        }
      }
      .widgetURL(hero.link)
    } else {
      CountdownEmpty(family: family)
        .widgetURL(URL(string: "prysm://wishlist"))
    }
  }
}

// MARK: Small — one number, one glass object breaking the edge

struct CountdownSmall: View {
  let item: CountdownItem
  let date: Date

  var body: some View {
    let days = item.days(from: date)
    ZStack(alignment: .topLeading) {
      Bleed(color: Theme.glassBleed, center: UnitPoint(x: 0.85, y: 0.85), reach: 0.75)
      GeometryReader { geo in
        Image("hourglass")
          .resizable()
          .scaledToFit()
          .frame(height: geo.size.height * 0.72)
          .rotationEffect(.degrees(14))
          .position(x: geo.size.width - 22, y: geo.size.height - 38)
      }
      VStack(alignment: .leading, spacing: 0) {
        Text(days == 0 ? item.shortTitle : "\(item.shortTitle) in")
          .font(.system(size: 12, weight: .semibold))
          .foregroundStyle(Theme.accent)
          .lineLimit(1)
        if days == 0 {
          Text("Out\nnow")
            .font(Theme.numeral(34))
            .foregroundStyle(Theme.ink)
            .padding(.top, 6)
        } else {
          Text("\(days)")
            .font(Theme.numeral(days > 99 ? 56 : 76))
            .foregroundStyle(Theme.ink)
            .minimumScaleFactor(0.6)
            .lineLimit(1)
            .padding(.top, -2)
            .padding(.leading, -3) // optical: the glyph's side bearing, so the digit meets the label's edge
        }
        Spacer(minLength: 0)
        Text(days == 0 ? ReleaseDate.short(item.releaseDate) : "\(days == 1 ? "day" : "days") · \(ReleaseDate.short(item.releaseDate))")
          .font(.system(size: 12))
          .foregroundStyle(Theme.ink2)
      }
      .padding(Theme.padding)
    }
  }
}

// MARK: Medium — the wishlist as a fanned hand of covers

struct CountdownMedium: View {
  let hero: CountdownItem
  let rest: [CountdownItem]
  let date: Date

  var body: some View {
    let days = hero.days(from: date)
    ZStack {
      Bleed(color: Color(hex: hero.bleed), center: UnitPoint(x: 0.78, y: 0.55), reach: 0.6)
      HStack(alignment: .top, spacing: 0) {
        VStack(alignment: .leading, spacing: 0) {
          Text(days == 0 ? "Out now" : "Out in")
            .font(.system(size: 12, weight: .semibold))
            .foregroundStyle(Theme.accent)
          if days > 0 {
            HStack(alignment: .firstTextBaseline, spacing: 6) {
              Text("\(days)")
                .font(Theme.numeral(68))
                .foregroundStyle(Theme.ink)
                .minimumScaleFactor(0.6)
                .lineLimit(1)
                .padding(.leading, -3)
              Text(days == 1 ? "day" : "days")
                .font(.system(size: 14))
                .foregroundStyle(Theme.ink2)
            }
          }
          Spacer(minLength: 0)
          Text(hero.title)
            .font(.system(size: 15, weight: .semibold))
            .foregroundStyle(Theme.ink)
            .lineLimit(days == 0 ? 3 : 1)
          Text(ReleaseDate.long(hero.releaseDate))
            .font(.system(size: 12))
            .foregroundStyle(Theme.ink2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        CoverFan(hero: hero, rest: rest, date: date)
          .frame(width: 170)
      }
      .padding(Theme.padding)
    }
  }
}

/// Nearest release on top; each later one sits behind it, tagged with its own count.
struct CoverFan: View {
  let hero: CountdownItem
  let rest: [CountdownItem]
  let date: Date

  var body: some View {
    ZStack(alignment: .topTrailing) {
      if rest.count > 1 {
        tagged(rest[1], width: 62, opacity: 0.75).rotationEffect(.degrees(-9)).offset(x: -92, y: 30)
      }
      if let second = rest.first {
        tagged(second, width: 78, opacity: 0.9).rotationEffect(.degrees(-3)).offset(x: -50, y: 16)
      }
      CoverView(item: hero, width: 100, radius: 10).rotationEffect(.degrees(4)).offset(x: 2, y: 2)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
  }

  private func tagged(_ item: CountdownItem, width: CGFloat, opacity: Double) -> some View {
    CoverView(item: item, width: width)
      .opacity(opacity)
      .overlay(alignment: .bottomLeading) {
        Text("\(item.days(from: date))d")
          .font(.system(size: 10, weight: .bold))
          .foregroundStyle(.white)
          .padding(.horizontal, 6)
          .padding(.vertical, 2)
          .background(.black.opacity(0.72), in: Capsule())
          .padding(.leading, 4)
          .padding(.bottom, 6)
      }
  }
}

// MARK: Lock screen — monochrome, the number carries it

struct CountdownRectangular: View {
  let item: CountdownItem
  let date: Date

  var body: some View {
    let days = item.days(from: date)
    HStack(spacing: 10) {
      if let image = SnapshotStore.cover(item.coverFile, maxPixel: 160) {
        Image(uiImage: image)
          .resizable()
          .aspectRatio(contentMode: .fill)
          .frame(width: 30, height: 40)
          .clipShape(RoundedRectangle(cornerRadius: 5, style: .continuous))
          .widgetAccentable(false)
      }
      VStack(alignment: .leading, spacing: 0) {
        Text(item.shortTitle).font(.system(size: 12, weight: .semibold)).lineLimit(1).opacity(0.7)
        Text(days == 0 ? "Out now" : "\(days)d").font(Theme.numeral(days == 0 ? 18 : 26)).widgetAccentable()
      }
      Spacer(minLength: 0)
    }
  }
}

struct CountdownCircular: View {
  let item: CountdownItem
  let date: Date

  var body: some View {
    let days = item.days(from: date)
    ZStack {
      AccessoryWidgetBackground()
      VStack(spacing: -2) {
        Text(days == 0 ? "OUT" : "\(days)").font(Theme.numeral(days > 99 || days == 0 ? 15 : 22)).minimumScaleFactor(0.6)
        Text(days == 0 ? "now" : (days == 1 ? "day" : "days")).font(.system(size: 9, weight: .semibold)).opacity(0.7)
      }
      .padding(4)
    }
  }
}

// MARK: Empty

struct CountdownEmpty: View {
  let family: WidgetFamily

  var body: some View {
    switch family {
    case .accessoryInline: Text("No releases on your wishlist")
    case .accessoryCircular:
      ZStack { AccessoryWidgetBackground(); Image(systemName: "hourglass") }
    case .accessoryRectangular:
      VStack(alignment: .leading) {
        Text("Release countdown").font(.system(size: 12, weight: .semibold)).opacity(0.7)
        Text("Wishlist a game").font(.system(size: 15, weight: .semibold))
      }
    default:
      ZStack(alignment: .topLeading) {
        Bleed(color: Theme.glassBleed, center: UnitPoint(x: 0.85, y: 0.85), reach: 0.75)
        GeometryReader { geo in
          Image("hourglass").resizable().scaledToFit()
            .frame(height: geo.size.height * 0.72)
            .rotationEffect(.degrees(14))
            .position(x: geo.size.width - 22, y: geo.size.height - 38)
        }
        VStack(alignment: .leading, spacing: 4) {
          Text("Release countdown").font(.system(size: 12, weight: .semibold)).foregroundStyle(Theme.accent)
          Spacer(minLength: 0)
          Text("Wishlist a game to count it down")
            .font(.system(size: 15, weight: .semibold))
            .foregroundStyle(Theme.ink)
            .frame(maxWidth: 190, alignment: .leading)
        }
        .padding(Theme.padding)
      }
    }
  }
}
