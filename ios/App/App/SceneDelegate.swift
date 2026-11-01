import UIKit
import Capacitor

/// The game's web view controller. Same as Capacitor's bridge, plus what the Android MainActivity does:
/// full-screen play, no accidental system gestures while dragging parts near the screen edges.
class GameViewController: CAPBridgeViewController {
    // (the status bar is hidden app-wide in Info.plist)
    // hide the home bar while playing; it fades back in when the player touches the bottom edge
    override var prefersHomeIndicatorAutoHidden: Bool { true }
    // the part tray sits at the bottom: the first swipe there goes to the game, a second one goes home
    override var preferredScreenEdgesDeferringSystemGestures: UIRectEdge { [.bottom, .top] }

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        guard let webView = webView else { return }
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 7 / 255, green: 10 / 255, blue: 20 / 255, alpha: 1)
        webView.scrollView.backgroundColor = webView.backgroundColor
        webView.scrollView.bounces = false
        webView.scrollView.alwaysBounceVertical = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.allowsLinkPreview = false
    }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.backgroundColor = UIColor(red: 7 / 255, green: 10 / 255, blue: 20 / 255, alpha: 1)
        window?.rootViewController = GameViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    // keep the screen awake while the game is open (Android: FLAG_KEEP_SCREEN_ON)
    func sceneDidBecomeActive(_ scene: UIScene) {
        UIApplication.shared.isIdleTimerDisabled = true
    }

    func sceneWillResignActive(_ scene: UIScene) {
        UIApplication.shared.isIdleTimerDisabled = false
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
