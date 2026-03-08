"""
Speech-to-Text com OpenAI Whisper
Transcreve áudio do microfone ou arquivo WAV em português do Brasil
"""
import os
import sys
import tempfile
import numpy as np
from typing import Optional

# Lazy load do Whisper para não travar a inicialização do servidor
_whisper_model = None

def _get_model(model_size: str = "base"):
    """Carrega o modelo Whisper (lazy loading)"""
    global _whisper_model
    if _whisper_model is None:
        try:
            import whisper
            print(f"🎙️ Carregando Whisper modelo '{model_size}'...")
            _whisper_model = whisper.load_model(model_size)
            print("✅ Whisper pronto!")
        except ImportError:
            raise RuntimeError("Whisper não instalado. Execute: pip install openai-whisper")
    return _whisper_model


def transcribe_audio(audio_path: str, language: str = "pt") -> str:
    """
    Transcreve um arquivo de áudio (WAV/MP3/etc) para texto.
    
    Args:
        audio_path: Caminho para o arquivo de áudio
        language: Idioma esperado (default: "pt" para português)
    
    Returns:
        Texto transcrito
    """
    model = _get_model()
    
    result = model.transcribe(
        audio_path,
        language=language,
        fp16=False,  # Compatível com CPU
        verbose=False
    )
    
    text = result["text"].strip()
    print(f"🎙️ Transcrição: '{text}'")
    return text


def transcribe_from_microphone(duration_seconds: int = 5, sample_rate: int = 16000) -> str:
    """
    Grava do microfone e transcreve usando Whisper.
    Usa OpenClaw para capturar o áudio se disponível, senão usa sounddevice.
    
    Args:
        duration_seconds: Duração da gravação em segundos
        sample_rate: Taxa de amostragem (16000 é o ideal pro Whisper)
    
    Returns:
        Texto transcrito
    """
    audio_data = None

    # Tentar OpenClaw primeiro
    try:
        import openclaw
        print(f"🎙️ Gravando {duration_seconds}s via OpenClaw...")
        audio_data = openclaw.record_audio(duration=duration_seconds, sample_rate=sample_rate)
    except (ImportError, AttributeError):
        pass

    # Fallback para sounddevice
    if audio_data is None:
        try:
            import sounddevice as sd
            print(f"🎙️ Gravando {duration_seconds}s via microfone...")
            audio_data = sd.rec(
                int(duration_seconds * sample_rate),
                samplerate=sample_rate,
                channels=1,
                dtype=np.float32
            )
            sd.wait()
            audio_data = audio_data.flatten()
        except ImportError:
            raise RuntimeError("sounddevice não instalado. Execute: pip install sounddevice")

    # Salvar em arquivo temporário e transcrever
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        try:
            import soundfile as sf
            sf.write(tmp.name, audio_data, sample_rate)
        except ImportError:
            import scipy.io.wavfile as wav
            wav.write(tmp.name, sample_rate, (audio_data * 32767).astype(np.int16))
        
        transcription = transcribe_audio(tmp.name)
        os.unlink(tmp.name)
        return transcription


if __name__ == "__main__":
    # Teste rápido
    print("Testando STT — fale algo em 5 segundos...")
    result = transcribe_from_microphone(duration_seconds=5)
    print(f"Você disse: {result}")
