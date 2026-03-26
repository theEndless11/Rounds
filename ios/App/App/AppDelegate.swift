import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        window?.backgroundColor = UIColor.black

        // Check stored theme and apply correct status bar style natively
        // before webview loads to prevent any flash
        let storedTheme = UserDefaults.standard.string(forKey: "CAPStorage::app-theme")
        let isLight = storedTheme == "\"light\""

        if isLight {
            UIApplication.shared.statusBarStyle = .darkContent
            window?.backgroundColor = UIColor.white
        } else {
            UIApplication.shared.statusBarStyle = .lightContent
            window?.backgroundColor = UIColor.black
        }

        // Listen for theme changes from JS via notifications
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleThemeChange(_:)),
            name: NSNotification.Name("AppThemeChanged"),
            object: nil
        )

        return true
    }

    @objc func handleThemeChange(_ notification: Notification) {
        guard let isLight = notification.userInfo?["isLight"] as? Bool else { return }
        DispatchQueue.main.async {
            UIApplication.shared.statusBarStyle = isLight ? .darkContent : .lightContent
        }
    }

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationDidBecomeActive(_ application: UIApplication) {}
    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}