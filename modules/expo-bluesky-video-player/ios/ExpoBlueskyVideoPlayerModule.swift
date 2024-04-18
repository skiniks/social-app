import ExpoModulesCore

public class ExpoBlueskyVideoPlayerModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoBlueskyVideoPlayer")
    
    AsyncFunction("prefetchAsync") { (source: String) in
      PlayerItemManager.shared.saveToCache(source: source)
    }

    View(ExpoBlueskyVideoPlayerView.self) {
      Events(["onLoad"])
      
      Prop("source") { (view: ExpoBlueskyVideoPlayerView, prop: String) in
        view.source = prop
      }
      
      Prop("autoplay") { (view: ExpoBlueskyVideoPlayerView, prop: Bool) in
        view.autoplay = prop
      }
      
      AsyncFunction("getIsPlayingAsync") { (view: ExpoBlueskyVideoPlayerView, promise: Promise) in
        promise.resolve(view.isPlaying)
      }
      
      AsyncFunction("toggleAsync") { (view: ExpoBlueskyVideoPlayerView) in
        view.toggle()
      }
      
      AsyncFunction("playAsync") { (view: ExpoBlueskyVideoPlayerView) in
        view.play()
      }
      
      AsyncFunction("pauseAsync") { (view: ExpoBlueskyVideoPlayerView) in
        view.pause()
      }
    }
  }
}
