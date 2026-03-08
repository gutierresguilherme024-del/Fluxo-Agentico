"""
Text-to-Speech com Coqui TTS (XTTS v2)
Gera áudio em PT-BR com voz natural e expressiva
"""
import io
import os
import tempfile
import numpy as np
from typing import Optional

# Lazy load do TTS
_tts_model = None


def _get_tts(model_name: str = "tts_models/multilingual/multi-dataset/xtts_v2"):
    """Carrega o modelo TTS (lazy loading — levará alguns segundos na primeira vez)"""
    global _tts_model
    if _tts_model is None:
        try:
            from TTS.api import TTS
            print(f"🔊 Carregando TTS '{model_name}'...")
            print("   (Primeira vez pode demorar — baixando modelo ~2GB)")
            _tts_model = TTS(model_name=model_name, progress_bar=True)
            print("✅ TTS pronto!")
        except ImportError:
            raise RuntimeError(
                "Coqui TTS não instalado.\n"
                "Execute: pip install TTS\n"
                "Ou instale via requirements.txt: pip install -r requirements.txt"
            )
    return _tts_model


def synthesize_speech(
    text: str,
    language: str = "pt",
    speaker_wav: Optional[str] = None,
    speaker: str = "Ana Florence"
) -> bytes:
    """
    Converte texto em áudio WAV usando Coqui TTS XTTS v2.
    
    Args:
        text: Texto para sintetizar
        language: Idioma ("pt" para português)
        speaker_wav: Arquivo WAV de referência para clonagem de voz (opcional)
        speaker: Nome do speaker padrão se não usar clonagem
    
    Returns:
        Bytes do arquivo WAV gerado
    """
    tts = _get_tts()
    
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        try:
            if speaker_wav and os.path.exists(speaker_wav):
                # Clonagem de voz com arquivo de referência
                tts.tts_to_file(
                    text=text,
                    speaker_wav=speaker_wav,
                    language=language,
                    file_path=tmp.name
                )
            else:
                # Voz padrão em PT-BR
                tts.tts_to_file(
                    text=text,
                    language=language,
                    file_path=tmp.name
                )
            
            with open(tmp.name, "rb") as f:
                audio_bytes = f.read()
        finally:
            os.unlink(tmp.name)
    
    print(f"🔊 TTS gerou áudio para: '{text[:60]}...'")
    return audio_bytes


def speak(text: str, language: str = "pt"):
    """
    Sintetiza e reproduz o áudio imediatamente.
    Usa OpenClaw para playback se disponível, senão usa sounddevice.
    """
    audio_bytes = synthesize_speech(text, language=language)
    
    # Converter bytes WAV para numpy array
    try:
        import soundfile as sf
        audio_data, sample_rate = sf.read(io.BytesIO(audio_bytes))
    except Exception:
        return

    # Tentar OpenClaw para reprodução
    try:
        import openclaw
        openclaw.play_audio(audio_data, sample_rate=sample_rate)
        return
    except (ImportError, AttributeError):
        pass

    # Fallback para sounddevice
    try:
        import sounddevice as sd
        sd.play(audio_data, sample_rate)
        sd.wait()
    except ImportError:
        print(f"🔊 [TTS] {text}")


# ─── Fallback: TTS simples sem modelo pesado (para desenvolvimento) ────────────
def synthesize_speech_simple(text: str) -> bytes:
    """
    TTS simples usando pyttsx3 como fallback leve.
    Qualidade menor, mas não precisa baixar ~2GB de modelos.
    """
    try:
        import pyttsx3
        engine = pyttsx3.init()
        
        # Configurar para PT-BR se disponível
        voices = engine.getProperty('voices')
        for voice in voices:
            if 'pt' in voice.id.lower() or 'brazil' in voice.name.lower():
                engine.setProperty('voice', voice.id)
                break
        
        engine.setProperty('rate', 180)
        engine.setProperty('volume', 0.9)
        
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            engine.save_to_file(text, tmp.name)
            engine.runAndWait()
            with open(tmp.name, 'rb') as f:
                return f.read()
    except ImportError:
        # Último recurso: retorna bytes vazios
        print(f"🔊 [TTS-fallback sem áudio] {text}")
        return b""


if __name__ == "__main__":
    # Teste rápido
    test_text = "Olá! Eu sou o seu Agente de Voz Autônomo. Como posso te ajudar hoje?"
    print(f"Sintetizando: '{test_text}'")
    speak(test_text)
