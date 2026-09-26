import Capacitor
import Foundation
import MultipeerConnectivity
import UIKit

// Native MultipeerConnectivity bridge for "Play your coworker" (ported from Cubes'
// plugin, unchanged but for the service type). One phone hosts
// (advertises), the other browses and invites; once connected, both send/receive
// the JSON game protocol as base64 `Data`. Paired with the JS wrapper in
// src/net/multipeerLink.ts. iOS 14+ prompts for local-network permission on first
// advertise/browse (see NSLocalNetworkUsageDescription / NSBonjourServices).
@objc(MultipeerPlugin)
public class MultipeerPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "MultipeerPlugin"
    public let jsName = "Multipeer"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "startHosting", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startBrowsing", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "invite", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "send", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "disconnect", returnType: CAPPluginReturnPromise),
    ]

    private var service: MultipeerService?

    private func ensureService(_ displayName: String) -> MultipeerService {
        if let s = service { return s }
        let s = MultipeerService(displayName: displayName) { [weak self] event, data in
            // MC callbacks arrive off the main thread; hop back before notifying JS.
            DispatchQueue.main.async { self?.notifyListeners(event, data: data) }
        }
        service = s
        return s
    }

    // NB: only the 2-arg `getString(_:_:)` and plain `resolve()` are used — the
    // 1-arg optional getString and `reject(...)` sit behind an experimental
    // ($NonescapableTypes) compiler flag that the app target doesn't enable, so
    // they aren't visible here. The JS wrapper treats these calls as
    // fire-and-forget, so a bad-arg path just resolves without acting.
    @objc func startHosting(_ call: CAPPluginCall) {
        let name = call.getString("displayName", UIDevice.current.name)
        let type = call.getString("service", "qbr-cowork")
        ensureService(name).startHosting(serviceType: type)
        call.resolve()
    }

    @objc func startBrowsing(_ call: CAPPluginCall) {
        let name = call.getString("displayName", UIDevice.current.name)
        let type = call.getString("service", "qbr-cowork")
        ensureService(name).startBrowsing(serviceType: type)
        call.resolve()
    }

    @objc func invite(_ call: CAPPluginCall) {
        let peerId = call.getString("peerId", "")
        if !peerId.isEmpty { service?.invite(peerId: peerId) }
        call.resolve()
    }

    @objc func send(_ call: CAPPluginCall) {
        let b64 = call.getString("data", "")
        if let data = Data(base64Encoded: b64) { service?.send(data) }
        call.resolve()
    }

    @objc func stop(_ call: CAPPluginCall) {
        service?.stop()
        call.resolve()
    }

    @objc func disconnect(_ call: CAPPluginCall) {
        service?.disconnect()
        service = nil
        call.resolve()
    }
}

// The MultipeerConnectivity machinery, isolated from the Capacitor plumbing. Auto-
// accepts invitations (a 2-player casual game — no invite UI needed) and reports
// peers to JS by displayName, which doubles as the peerId the JS side invites by.
final class MultipeerService: NSObject {
    typealias Emit = (_ event: String, _ data: [String: Any]) -> Void

    private let myPeerId: MCPeerID
    private let emit: Emit
    private var session: MCSession
    private var advertiser: MCNearbyServiceAdvertiser?
    private var browser: MCNearbyServiceBrowser?
    private var found: [String: MCPeerID] = [:]

    init(displayName: String, emit: @escaping Emit) {
        self.myPeerId = MCPeerID(displayName: displayName)
        self.emit = emit
        self.session = MCSession(peer: myPeerId, securityIdentity: nil, encryptionPreference: .required)
        super.init()
        self.session.delegate = self
    }

    func startHosting(serviceType: String) {
        let adv = MCNearbyServiceAdvertiser(peer: myPeerId, discoveryInfo: nil, serviceType: serviceType)
        adv.delegate = self
        adv.startAdvertisingPeer()
        advertiser = adv
    }

    func startBrowsing(serviceType: String) {
        let br = MCNearbyServiceBrowser(peer: myPeerId, serviceType: serviceType)
        br.delegate = self
        br.startBrowsingForPeers()
        browser = br
    }

    func invite(peerId: String) {
        guard let peer = found[peerId], let br = browser else { return }
        br.invitePeer(peer, to: session, withContext: nil, timeout: 30)
    }

    func send(_ data: Data) {
        guard !session.connectedPeers.isEmpty else { return }
        try? session.send(data, toPeers: session.connectedPeers, with: .reliable)
    }

    func stop() {
        advertiser?.stopAdvertisingPeer()
        browser?.stopBrowsingForPeers()
        advertiser = nil
        browser = nil
        found.removeAll()
    }

    func disconnect() {
        stop()
        session.disconnect()
    }
}

extension MultipeerService: MCSessionDelegate {
    func session(_ session: MCSession, peer peerID: MCPeerID, didChange state: MCSessionState) {
        switch state {
        case .connected:
            emit("connected", ["peerId": peerID.displayName, "name": peerID.displayName])
        case .notConnected:
            emit("disconnected", ["peerId": peerID.displayName])
        case .connecting:
            break
        @unknown default:
            break
        }
    }

    func session(_ session: MCSession, didReceive data: Data, fromPeer peerID: MCPeerID) {
        emit("receive", ["data": data.base64EncodedString()])
    }

    // Unused stream/resource callbacks (required by the protocol).
    func session(_ s: MCSession, didReceive stream: InputStream, withName n: String, fromPeer p: MCPeerID) {}
    func session(_ s: MCSession, didStartReceivingResourceWithName n: String, fromPeer p: MCPeerID, with progress: Progress) {}
    func session(_ s: MCSession, didFinishReceivingResourceWithName n: String, fromPeer p: MCPeerID, at localURL: URL?, withError error: Error?) {}
}

extension MultipeerService: MCNearbyServiceAdvertiserDelegate {
    func advertiser(_ advertiser: MCNearbyServiceAdvertiser,
                    didReceiveInvitationFromPeer peerID: MCPeerID,
                    withContext context: Data?,
                    invitationHandler: @escaping (Bool, MCSession?) -> Void) {
        invitationHandler(true, session) // auto-accept: casual 2-player, no invite UI
    }
}

extension MultipeerService: MCNearbyServiceBrowserDelegate {
    func browser(_ browser: MCNearbyServiceBrowser, foundPeer peerID: MCPeerID, withDiscoveryInfo info: [String: String]?) {
        found[peerID.displayName] = peerID
        emit("peerFound", ["peerId": peerID.displayName, "name": peerID.displayName])
    }

    func browser(_ browser: MCNearbyServiceBrowser, lostPeer peerID: MCPeerID) {
        found.removeValue(forKey: peerID.displayName)
        emit("peerLost", ["peerId": peerID.displayName])
    }
}
