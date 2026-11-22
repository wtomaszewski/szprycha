package pl.szprycha.game;

import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Comparator;
import java.util.Locale;
import java.util.Set;

@CapacitorPlugin(name = "LocalSpeech")
public class LocalSpeechPlugin extends Plugin {
    private static final Locale POLISH = Locale.forLanguageTag("pl-PL");
    private TextToSpeech engine;
    private boolean ready;
    private PluginCall active;

    @Override
    public void load() {
        getActivity().runOnUiThread(() -> {
            engine = new TextToSpeech(getContext(), status ->
                getActivity().runOnUiThread(() -> ready = status == TextToSpeech.SUCCESS));
            engine.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                @Override public void onStart(String id) {}
                @Override public void onDone(String id) { finish(id, true); }
                @Override public void onStop(String id, boolean interrupted) { finish(id, false); }
                @Override public void onError(String id) { finish(id, false); }
            });
        });
    }

    @PluginMethod
    public void speak(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            stopActive();
            Set<Voice> voices = ready ? engine.getVoices() : null;
            if (voices == null || !voices.stream()
                .filter(voice -> "pl".equals(voice.getLocale().getLanguage()))
                .filter(voice -> !voice.isNetworkConnectionRequired())
                .filter(voice -> voice.getFeatures() == null ||
                    !voice.getFeatures().contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED))
                .sorted(Comparator.comparing(voice -> !POLISH.equals(voice.getLocale())))
                .anyMatch(voice -> engine.setVoice(voice) == TextToSpeech.SUCCESS)) {
                call.reject("No installed offline Polish voice");
                return;
            }
            Bundle options = new Bundle();
            options.putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, call.getFloat("volume", 1f));
            active = call;
            String id = call.getCallbackId();
            if (engine.speak(call.getString("text", ""), TextToSpeech.QUEUE_FLUSH, options, id)
                != TextToSpeech.SUCCESS) finish(id, false);
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            stopActive();
            call.resolve();
        });
    }

    private void stopActive() {
        PluginCall call = active;
        active = null;
        if (call != null) {
            engine.stop();
            call.resolve();
        }
    }

    private void finish(String id, boolean succeeded) {
        getActivity().runOnUiThread(() -> {
            if (active == null || !active.getCallbackId().equals(id)) return;
            PluginCall call = active;
            active = null;
            if (succeeded) call.resolve();
            else call.reject("Offline speech failed");
        });
    }

    @Override
    protected void handleOnDestroy() {
        getActivity().runOnUiThread(() -> {
            stopActive();
            if (engine != null) engine.shutdown();
        });
    }
}
