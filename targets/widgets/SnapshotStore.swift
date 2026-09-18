import Foundation
import ImageIO
import UIKit

/// Mirrors `WidgetSnapshot` in src/features/widgets/snapshot/types.ts. Change both together.
struct WidgetSnapshot: Decodable {
  let version: Int
  let generatedAt: Double
  let isPlus: Bool
  let countdown: Countdown

  struct Countdown: Decodable {
    let items: [CountdownItem]
  }
}

struct CountdownItem: Decodable, Identifiable {
  let catalogId: String
  let title: String
  let shortTitle: String
  /// ISO date, yyyy-MM-dd.
  let releaseDate: String
  let coverFile: String?
  let bleed: String

  var id: String { catalogId }
}

enum SnapshotStore {
  static let appGroup = "group.com.nathanakin.revenuecatgame"
  static let key = "widgetSnapshot"
  static let coverDir = "widget-covers"
  static let supportedVersion = 1

  /// The last snapshot the app published, or nil when there is none, it cannot be decoded,
  /// or a newer app wrote a version this widget does not know. The caller shows the empty state.
  static func load() -> WidgetSnapshot? {
    guard
      let json = UserDefaults(suiteName: appGroup)?.string(forKey: key),
      let data = json.data(using: .utf8),
      let snapshot = try? JSONDecoder().decode(WidgetSnapshot.self, from: data),
      snapshot.version == supportedVersion
    else { return nil }
    return snapshot
  }

  /// Decodes a cover straight to thumbnail size. WidgetKit kills an extension that holds large
  /// bitmaps, so a full decode followed by a resize is not safe here.
  static func cover(_ file: String?, maxPixel: CGFloat = 420) -> UIImage? {
    guard
      let file,
      let container = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroup)
    else { return nil }
    let url = container.appendingPathComponent(coverDir).appendingPathComponent(file)
    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil) else { return nil }
    let options: [CFString: Any] = [
      kCGImageSourceCreateThumbnailFromImageAlways: true,
      kCGImageSourceCreateThumbnailWithTransform: true,
      kCGImageSourceThumbnailMaxPixelSize: maxPixel,
    ]
    guard let image = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary) else { return nil }
    return UIImage(cgImage: image)
  }
}

enum ReleaseDate {
  private static let parser: DateFormatter = {
    let formatter = DateFormatter()
    formatter.calendar = Calendar(identifier: .gregorian)
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.dateFormat = "yyyy-MM-dd"
    return formatter
  }()

  static func date(_ iso: String) -> Date? {
    parser.date(from: String(iso.prefix(10)))
  }

  /// Whole calendar days from `now` to the release. 0 is release day.
  static func daysUntil(_ iso: String, from now: Date) -> Int? {
    guard let target = date(iso) else { return nil }
    let calendar = Calendar.current
    return calendar.dateComponents([.day], from: calendar.startOfDay(for: now), to: calendar.startOfDay(for: target)).day
  }

  /// "4 Oct"
  static func short(_ iso: String) -> String {
    guard let date = date(iso) else { return "" }
    return date.formatted(.dateTime.day().month(.abbreviated))
  }

  /// "Saturday 4 October"
  static func long(_ iso: String) -> String {
    guard let date = date(iso) else { return "" }
    return date.formatted(.dateTime.weekday(.wide).day().month(.wide))
  }
}
