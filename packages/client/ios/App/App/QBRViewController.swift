import UIKit
import Capacitor

// The app's root view controller: Capacitor's bridge VC, plus registration of the
// app-target Multipeer plugin for "Play your coworker".
//
// Ported from Cubes' GameViewController, which documents why this is needed:
// Capacitor 8 auto-registers only the npm packages listed in the generated
// `capacitor.config.json` `packageClassList` (rebuilt on every `cap sync ios`), and a
// plugin that lives in THIS target can never appear there — so without this,
// `registerPlugin('Multipeer')` in JS gets a proxy with no native handler and every
// call silently rejects. The sanctioned `bridge?.registerPluginInstance(...)` is out of
// reach because the xcframework's `.swiftinterface` gates `bridge` behind
// `#if $NonescapableTypes`, so the bridge is found by reflection instead (Mirror walks
// the superclass chain; matched by conformance to the non-gated CAPBridgeProtocol).
class QBRViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        guard let bridge = Self.reflectedBridge(of: self) else {
            NSLog("[Multipeer] could not reach Capacitor bridge — plugin NOT registered")
            return
        }
        bridge.registerPluginInstance(MultipeerPlugin())
    }

    private static func reflectedBridge(of object: Any) -> CAPBridgeProtocol? {
        var mirror: Mirror? = Mirror(reflecting: object)
        while let m = mirror {
            for child in m.children {
                if let bridge = child.value as? CAPBridgeProtocol {
                    return bridge
                }
            }
            mirror = m.superclassMirror
        }
        return nil
    }
}
