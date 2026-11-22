import AVFoundation
import Capacitor

final class GameViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(LocalSpeechPlugin())
    }
}

final class LocalSpeechPlugin: CAPPlugin, CAPBridgedPlugin, AVSpeechSynthesizerDelegate {
    let identifier = "LocalSpeechPlugin"
    let jsName = "LocalSpeech"
    let pluginMethods = [
        CAPPluginMethod(name: "speak", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise)
    ]

    private let synthesizer = AVSpeechSynthesizer()
    private var active: (AVSpeechUtterance, CAPPluginCall)?

    override func load() {
        synthesizer.delegate = self
    }

    @objc func speak(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.stopActive()
            let polish = AVSpeechSynthesisVoice.speechVoices().filter {
                $0.language.lowercased().split(separator: "-").first == "pl"
            }
            guard let voice = polish.first(where: { $0.language.lowercased() == "pl-pl" }) ?? polish.first,
                  let text = call.getString("text") else {
                call.reject("No installed offline Polish voice")
                return
            }
            let utterance = AVSpeechUtterance(string: text)
            utterance.voice = voice
            utterance.volume = call.getFloat("volume") ?? 1
            self.active = (utterance, call)
            self.synthesizer.speak(utterance)
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.stopActive()
            call.resolve()
        }
    }

    private func stopActive() {
        let previous = active
        active = nil
        synthesizer.stopSpeaking(at: .immediate)
        previous?.1.resolve()
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        finish(utterance, cancelled: false)
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        finish(utterance, cancelled: true)
    }

    private func finish(_ utterance: AVSpeechUtterance, cancelled: Bool) {
        DispatchQueue.main.async {
            guard let (current, call) = self.active, current === utterance else { return }
            self.active = nil
            if cancelled { call.reject("Offline speech cancelled") }
            else { call.resolve() }
        }
    }
}
