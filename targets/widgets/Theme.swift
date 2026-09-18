import SwiftUI

enum Theme {
  static let accent = Color(hex: "#FD5021")
  static let ink = Color.white
  static let ink2 = Color.white.opacity(0.62)
  static let ink3 = Color.white.opacity(0.38)
  /// The warm tint of the glass objects, used when no cover lights the card.
  static let glassBleed = Color(hex: "#D46947")
  static let padding: CGFloat = 16

  /// The giant numerals: heavy, expanded, proportional figures so a leading "1" sits flush left.
  static func numeral(_ size: CGFloat) -> Font {
    .system(size: size, weight: .heavy).width(.expanded)
  }
}

extension Color {
  init(hex: String) {
    let cleaned = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
    var value: UInt64 = 0
    guard cleaned.count == 6, Scanner(string: cleaned).scanHexInt64(&value) else {
      self = Theme.accent
      return
    }
    self.init(
      red: Double((value >> 16) & 0xFF) / 255,
      green: Double((value >> 8) & 0xFF) / 255,
      blue: Double(value & 0xFF) / 255
    )
  }
}

/// One radial colour bleed on the black card. `center` is in unit coordinates.
struct Bleed: View {
  let color: Color
  let center: UnitPoint
  var reach: CGFloat = 0.9

  var body: some View {
    GeometryReader { geo in
      RadialGradient(
        colors: [color.opacity(0.7), color.opacity(0.0)],
        center: center,
        startRadius: 0,
        endRadius: max(geo.size.width, geo.size.height) * reach
      )
    }
  }
}

/// A game cover with the fallback swatch the app uses when there is no art.
struct CoverView: View {
  let item: any CoverArt
  let width: CGFloat
  var radius: CGFloat = 8

  var body: some View {
    Group {
      if let image = SnapshotStore.cover(item.coverFile) {
        Image(uiImage: image).resizable().aspectRatio(contentMode: .fill)
      } else {
        ZStack {
          Color(hex: item.bleed)
          Text(String(item.title.prefix(2)).uppercased())
            .font(.system(size: width * 0.3, weight: .heavy))
            .foregroundStyle(.white.opacity(0.9))
        }
      }
    }
    .frame(width: width, height: width * 4 / 3)
    .clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
    .shadow(color: .black.opacity(0.5), radius: 8, y: 6)
  }
}

/// A cover that fills the whole card, with the dark foot the text sits on.
struct FullBleedCover: View {
  let item: any CoverArt

  var body: some View {
    GeometryReader { geo in
      ZStack {
        if let image = SnapshotStore.cover(item.coverFile, maxPixel: 600) {
          Image(uiImage: image).resizable().aspectRatio(contentMode: .fill)
            .frame(width: geo.size.width, height: geo.size.height)
            .clipped()
        } else {
          Color(hex: item.bleed)
        }
        LinearGradient(
          stops: [.init(color: .black.opacity(0), location: 0.25), .init(color: .black.opacity(0.78), location: 0.62), .init(color: .black.opacity(0.94), location: 1)],
          startPoint: .top, endPoint: .bottom
        )
      }
    }
  }
}

/// The orange action pill, and its quiet sibling.
struct Pill: View {
  let text: String
  var quiet = false

  var body: some View {
    Text(text)
      .font(.system(size: 13, weight: .semibold))
      .foregroundStyle(.white)
      .padding(.horizontal, 12)
      .frame(height: 30)
      .background(quiet ? Color.white.opacity(0.12) : Theme.accent, in: Capsule())
  }
}
