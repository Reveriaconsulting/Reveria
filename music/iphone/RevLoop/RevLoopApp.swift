// =============================================================================
//  RevLoop — l'application iPhone
// =============================================================================
// L'iPhone affiche le même logiciel que le Mac (le dossier « logiciel », copié dans
// l'application) dans une vue web plein écran. Trois choses sont faites ici en natif,
// parce qu'une page web ne sait pas les faire sur iPhone :
//  1. le MIDI : Safari n'a pas le MIDI. Un « pont » relie le MiniLab (branché en USB)
//     au logiciel, en imitant exactement l'API web que le logiciel utilise déjà ;
//  2. le son : il doit sortir même quand l'interrupteur silencieux est enclenché ;
//  3. la sauvegarde : le fichier .boucles est proposé dans « Enregistrer dans Fichiers ».

import SwiftUI
import WebKit
import CoreMIDI
import AVFoundation
import UniformTypeIdentifiers

@main
struct RevLoopApp: App {
    init() {
        // Le son sort même en mode silencieux, comme pour un instrument de musique
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
        try? AVAudioSession.sharedInstance().setActive(true)
        // L'écran ne se met pas en veille pendant qu'on joue
        UIApplication.shared.isIdleTimerDisabled = true
    }

    var body: some Scene {
        WindowGroup {
            VueLogiciel()
                .ignoresSafeArea()
                .background(Color(red: 6 / 255, green: 10 / 255, blue: 18 / 255))
                .statusBarHidden(true)
                .persistentSystemOverlays(.hidden)
        }
    }
}

// --- La vue web qui affiche le logiciel ---------------------------------------------------
struct VueLogiciel: UIViewRepresentable {
    func makeCoordinator() -> Coordinateur { Coordinateur() }

    func makeUIView(context: Context) -> WKWebView {
        let reglages = WKWebViewConfiguration()
        // Les fichiers du logiciel sont servis par l'adresse interne app://boucles/ (comme sur Mac)
        reglages.setURLSchemeHandler(ServeurInterne(), forURLScheme: "app")
        reglages.mediaTypesRequiringUserActionForPlayback = []
        reglages.allowsInlineMediaPlayback = true
        // Le pont MIDI : un petit script imite navigator.requestMIDIAccess dans la page
        reglages.userContentController.addUserScript(WKUserScript(
            source: PontMIDI.scriptDeLaPage, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        reglages.userContentController.add(context.coordinator.pont, name: "midi")

        let vue = WKWebView(frame: .zero, configuration: reglages)
        vue.isOpaque = false
        vue.backgroundColor = UIColor(red: 6 / 255, green: 10 / 255, blue: 18 / 255, alpha: 1)
        vue.scrollView.isScrollEnabled = false           // tout tient à l'écran, rien ne défile
        vue.scrollView.bounces = false
        vue.scrollView.contentInsetAdjustmentBehavior = .never
        vue.navigationDelegate = context.coordinator
        context.coordinator.pont.vue = vue
        context.coordinator.vue = vue
        vue.load(URLRequest(url: URL(string: "app://boucles/index.html")!))
        return vue
    }

    func updateUIView(_ vue: WKWebView, context: Context) {}

    // Reçoit les téléchargements (Fichier › Sauvegarder) et les propose dans « Fichiers »
    final class Coordinateur: NSObject, WKNavigationDelegate, WKDownloadDelegate {
        let pont = PontMIDI()
        weak var vue: WKWebView?
        private var fichierEnCours: URL?

        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            decisionHandler(action.shouldPerformDownload ? .download : .allow)
        }

        func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) {
            download.delegate = self
        }

        func download(_ download: WKDownload, decideDestinationUsing reponse: URLResponse,
                      suggestedFilename nom: String, completionHandler: @escaping (URL?) -> Void) {
            let cible = FileManager.default.temporaryDirectory.appendingPathComponent(nom)
            try? FileManager.default.removeItem(at: cible)
            fichierEnCours = cible
            completionHandler(cible)
        }

        func downloadDidFinish(_ download: WKDownload) {
            guard let fichier = fichierEnCours, let vue = vue,
                  let fenetre = vue.window?.rootViewController else { return }
            let choix = UIDocumentPickerViewController(forExporting: [fichier], asCopy: true)
            fenetre.present(choix, animated: true)
        }
    }
}

// --- L'adresse interne : app://boucles/sons/piano/60.ogg → le fichier dans l'application ---
final class ServeurInterne: NSObject, WKURLSchemeHandler {
    private let racine = Bundle.main.url(forResource: "logiciel", withExtension: nil)!

    func webView(_ webView: WKWebView, start tache: WKURLSchemeTask) {
        guard let adresse = tache.request.url else { return }
        // (on ignore le « ?v=… » que le logiciel ajoute pour éviter les vieilles versions en mémoire)
        let fichier = racine.appendingPathComponent(adresse.path).standardizedFileURL
        guard fichier.path.hasPrefix(racine.standardizedFileURL.path),
              let donnees = try? Data(contentsOf: fichier) else {
            tache.didFailWithError(URLError(.fileDoesNotExist))
            return
        }
        let type = UTType(filenameExtension: fichier.pathExtension)?.preferredMIMEType ?? "application/octet-stream"
        let reponse = HTTPURLResponse(url: adresse, statusCode: 200, httpVersion: "HTTP/1.1",
                                      headerFields: ["Content-Type": type, "Content-Length": "\(donnees.count)",
                                                     "Cache-Control": "no-store"])!
        tache.didReceive(reponse)
        tache.didReceive(donnees)
        tache.didFinish()
    }

    func webView(_ webView: WKWebView, stop tache: WKURLSchemeTask) {}
}

// --- Le pont MIDI (CoreMIDI ↔ la page) ------------------------------------------------------
final class PontMIDI: NSObject, WKScriptMessageHandler {
    weak var vue: WKWebView?
    private var client = MIDIClientRef()
    private var portEntree = MIDIPortRef()
    private var portSortie = MIDIPortRef()
    private var demarre = false

    // Le script injecté dans la page : il imite navigator.requestMIDIAccess (entrées, sorties,
    // onmidimessage, send, sysexEnabled), juste ce que le logiciel utilise.
    static let scriptDeLaPage = """
    (() => {
      const entrees = new Map(), sorties = new Map();
      let attente = null, acces = null;
      // un paquet USB peut contenir plusieurs messages : on les sépare
      const longueur = s => s >= 0xF0 ? ({ 0xF1: 2, 0xF2: 3, 0xF3: 2 }[s] || 1) : ((s & 0xF0) === 0xC0 || (s & 0xF0) === 0xD0 ? 2 : 3);
      function decouper(octets) {
        const messages = [];
        for (let i = 0; i < octets.length;) {
          if (octets[i] === 0xF0) { const fin = octets.indexOf(0xF7, i); const j = fin < 0 ? octets.length : fin + 1; messages.push(octets.slice(i, j)); i = j; }
          else if (octets[i] & 0x80) { const n = longueur(octets[i]); messages.push(octets.slice(i, i + n)); i += n; }
          else i++;
        }
        return messages;
      }
      window.__revloopMIDI = {
        // La liste complète des ports, envoyée au démarrage et à chaque clavier branché ou débranché :
        // les ports disparus sont retirés, et la page est prévenue (onstatechange), comme dans Chrome.
        ports(liste) {
          let change = false;
          for (const carte of [entrees, sorties]) {
            for (const [id, port] of carte) {
              if (liste.some(p => p.id === id && p.type === port.type)) continue;
              port.state = 'disconnected';
              carte.delete(id);
              change = true;
            }
          }
          for (const p of liste) {
            const carte = p.type === 'input' ? entrees : sorties;
            if (carte.has(p.id)) continue;
            change = true;
            const port = { id: p.id, name: p.name, type: p.type, state: 'connected', onmidimessage: null, ecouteurs: [],
              addEventListener(t, f) { if (t === 'midimessage') this.ecouteurs.push(f); },
              removeEventListener(t, f) { this.ecouteurs = this.ecouteurs.filter(g => g !== f); },
              send(donnees) { window.webkit.messageHandlers.midi.postMessage({ type: 'envoyer', id: p.id, octets: Array.from(donnees) }); } };
            carte.set(p.id, port);
          }
          if (attente) {
            acces = acces || { inputs: entrees, outputs: sorties, sysexEnabled: true, onstatechange: null };
            attente(acces);
            attente = null;
          } else if (change && acces && acces.onstatechange) acces.onstatechange({});
        },
        recevoir(id, octets) {
          const port = entrees.get(id);
          if (!port) return;
          for (const m of decouper(octets)) {
            const evenement = { data: Uint8Array.from(m), timeStamp: performance.now(), target: port };
            if (port.onmidimessage) port.onmidimessage(evenement);
            for (const f of port.ecouteurs) f(evenement);
          }
        },
      };
      navigator.requestMIDIAccess = () => new Promise(ok => {
        attente = ok;
        window.webkit.messageHandlers.midi.postMessage({ type: 'demande' });
      });
    })();
    """

    func userContentController(_ controleur: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let corps = message.body as? [String: Any], let type = corps["type"] as? String else { return }
        if type == "demande" {
            demarrer()
            envoyerPorts()
        } else if type == "envoyer", let id = corps["id"] as? Int, let octets = corps["octets"] as? [Int] {
            envoyer(octets.map { UInt8(truncatingIfNeeded: $0) }, vers: MIDIEndpointRef(id))
        }
    }

    private func demarrer() {
        guard !demarre else { return }
        demarre = true
        // Un clavier branché ou débranché pendant le jeu : on rebranche tout et on prévient la page
        MIDIClientCreateWithBlock("RevLoop" as CFString, &client) { [weak self] _ in
            DispatchQueue.main.async { self?.connecterSources(); self?.envoyerPorts() }
        }
        MIDIInputPortCreateWithBlock(client, "RevLoop entrée" as CFString, &portEntree) { [weak self] liste, source in
            let id = Int(bitPattern: source)
            var octets: [UInt8] = []
            for paquet in liste.unsafeSequence() {
                octets.append(contentsOf: withUnsafeBytes(of: paquet.pointee.data) { Array($0.prefix(Int(paquet.pointee.length))) })
            }
            DispatchQueue.main.async {
                self?.vue?.evaluateJavaScript("__revloopMIDI.recevoir(\(id), \(octets))")
            }
        }
        MIDIOutputPortCreate(client, "RevLoop sortie" as CFString, &portSortie)
        connecterSources()
    }

    // Chaque source est connectée avec son numéro, pour savoir de quel port vient un message
    private func connecterSources() {
        for i in 0..<MIDIGetNumberOfSources() {
            let source = MIDIGetSource(i)
            MIDIPortDisconnectSource(portEntree, source)
            MIDIPortConnectSource(portEntree, source, UnsafeMutableRawPointer(bitPattern: Int(source)))
        }
    }

    private func nom(_ point: MIDIEndpointRef) -> String {
        var texte: Unmanaged<CFString>?
        MIDIObjectGetStringProperty(point, kMIDIPropertyDisplayName, &texte)
        return (texte?.takeRetainedValue() as String?) ?? "MIDI"
    }

    private func envoyerPorts() {
        var liste: [[String: Any]] = []
        for i in 0..<MIDIGetNumberOfSources() {
            let p = MIDIGetSource(i)
            liste.append(["id": Int(p), "name": nom(p), "type": "input"])
        }
        for i in 0..<MIDIGetNumberOfDestinations() {
            let p = MIDIGetDestination(i)
            liste.append(["id": Int(p), "name": nom(p), "type": "output"])
        }
        guard let json = try? JSONSerialization.data(withJSONObject: liste),
              let texte = String(data: json, encoding: .utf8) else { return }
        vue?.evaluateJavaScript("__revloopMIDI.ports(\(texte))")
    }

    // Couleurs des pads, textes de l'écran du MiniLab… (messages normaux ou SysEx)
    private func envoyer(_ octets: [UInt8], vers destination: MIDIEndpointRef) {
        let taille = 1024
        let memoire = UnsafeMutableRawPointer.allocate(byteCount: taille, alignment: MemoryLayout<MIDIPacketList>.alignment)
        defer { memoire.deallocate() }
        let liste = memoire.assumingMemoryBound(to: MIDIPacketList.self)
        let paquet = MIDIPacketListInit(liste)
        _ = octets.withUnsafeBufferPointer { MIDIPacketListAdd(liste, taille, paquet, 0, octets.count, $0.baseAddress!) }
        MIDISend(portSortie, destination, liste)
    }
}
