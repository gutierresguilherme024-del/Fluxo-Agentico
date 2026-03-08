import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, X, Brain, Zap, MessageSquare, Send } from 'lucide-react';
import { Agent } from '../types';

interface VoiceAgentProps {
    agent: Agent;
    userId?: string;
    onClose: () => void;
}

type AgentStatus = 'idle' | 'listening' | 'thinking' | 'speaking';

interface ChatMessage {
    role: 'user' | 'agent';
    content: string;
    timestamp: Date;
}

const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || '';

export default function VoiceAgent({ agent, onClose }: VoiceAgentProps) {
    const [status, setStatus] = useState<AgentStatus>('idle');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [waveValues, setWaveValues] = useState<number[]>(Array(20).fill(2));
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const waveInterval = useRef<NodeJS.Timeout | null>(null);
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);
    const conversationHistory = useRef<{ role: string; content: string }[]>([]);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Animação do Orb/wave
    useEffect(() => {
        if (status === 'listening' || status === 'speaking') {
            waveInterval.current = setInterval(() => {
                setWaveValues(Array(20).fill(0).map(() =>
                    status === 'listening'
                        ? Math.random() * 40 + 5
                        : Math.random() * 25 + 3
                ));
            }, 80);
        } else {
            if (waveInterval.current) clearInterval(waveInterval.current);
            setWaveValues(Array(20).fill(2));
        }
        return () => { if (waveInterval.current) clearInterval(waveInterval.current); };
    }, [status]);

    // Mensagem de boas-vindas
    useEffect(() => {
        setTimeout(() => {
            setMessages([{
                role: 'agent',
                content: `Olá! Sou ${agent.name}. Como posso te ajudar hoje?`,
                timestamp: new Date(),
            }]);
        }, 500);
    }, [agent.name]);

    // Enviar mensagem para Claude diretamente, com fallback para NVIDIA GLM
    const sendMessageToClaude = useCallback(async (userText: string) => {
        if (!userText.trim() || status === 'thinking') return;

        const newUserMessage: ChatMessage = { role: 'user', content: userText, timestamp: new Date() };
        setMessages(prev => [...prev, newUserMessage]);
        setInputText('');
        setStatus('thinking');

        // Adiciona ao histórico
        conversationHistory.current.push({ role: 'user', content: userText });

        try {
            const systemPrompt = agent.soul ||
                `Você é ${agent.name}, um assistente de inteligência artificial. Responda sempre em português do Brasil. Seja útil, direto e inteligente.`;

            let assistantText = '';

            try {
                // Tenta Anthropic Primeiro
                const response = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': ANTHROPIC_API_KEY,
                        'anthropic-version': '2023-06-01',
                        'anthropic-dangerous-direct-browser-access': 'true',
                    },
                    body: JSON.stringify({
                        model: 'claude-3-5-sonnet-20241022',
                        max_tokens: 1024,
                        system: systemPrompt,
                        messages: conversationHistory.current,
                    }),
                });

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    throw new Error(errData?.error?.message || `Erro ${response.status}`);
                }

                const data = await response.json();
                assistantText = data.content?.[0]?.text || 'Não consegui processar sua mensagem.';

            } catch (anthropicError: any) {
                console.warn('Anthropic falhou, tentando NVIDIA GLM fallback...', anthropicError.message);

                // Fallback para NVIDIA GLM (formato OpenAI)
                const nvidiaKey = import.meta.env.VITE_NVIDIA_API_KEY;
                const nvidiaBaseUrl = import.meta.env.VITE_NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
                const llmModel = import.meta.env.VITE_LLM_MODEL || 'z-ai/glm4.7';

                if (!nvidiaKey) {
                    throw anthropicError; // Se não tem fallback, estoura o erro original da Anthropic
                }

                const fallbackResponse = await fetch(`${nvidiaBaseUrl}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${nvidiaKey}`,
                    },
                    body: JSON.stringify({
                        model: llmModel,
                        max_tokens: 1024,
                        messages: [
                            { role: 'system', content: systemPrompt },
                            ...conversationHistory.current
                        ],
                    }),
                });

                if (!fallbackResponse.ok) {
                    const errData = await fallbackResponse.json().catch(() => ({}));
                    throw new Error(`Fallback falhou: ${errData?.error?.message || fallbackResponse.status}`);
                }

                const fallbackData = await fallbackResponse.json();
                assistantText = fallbackData.choices?.[0]?.message?.content || 'Não consegui processar sua mensagem via GLM.';
            }

            // Adiciona resposta ao histórico
            conversationHistory.current.push({ role: 'assistant', content: assistantText });

            setMessages(prev => [...prev, {
                role: 'agent',
                content: assistantText,
                timestamp: new Date(),
            }]);
            setStatus('speaking');
            setTimeout(() => setStatus('idle'), Math.min(assistantText.length * 40, 4000));

        } catch (err: any) {
            console.error('Jarvis error:', err);

            let errorMsg = err.message || 'Conexão falhou';
            if (errorMsg.includes('model: claude')) {
                errorMsg = "Sua chave da Anthropic não tem permissão para usar este modelo. Verifique seus limites/acessos na API da Anthropic.";
            }

            setMessages(prev => [...prev, {
                role: 'agent',
                content: `⚠️ Erro: ${errorMsg}`,
                timestamp: new Date(),
            }]);
            setStatus('idle');
        }
    }, [agent, status]);

    // Gravar voz via microfone (STT via Web Speech API — sem servidor)
    const startVoiceInput = useCallback(async () => {
        if (status !== 'idle') return;

        // Tentar usar Web Speech API primeiro (funciona no browser sem servidor)
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognitionConstructor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            const recognition = new SpeechRecognitionConstructor();
            recognition.lang = 'pt-BR';
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;

            setStatus('listening');

            recognition.onresult = async (event: any) => {
                const transcript = event.results[0][0].transcript;
                if (transcript) {
                    await sendMessageToClaude(transcript);
                }
            };

            recognition.onerror = () => {
                setStatus('idle');
            };

            recognition.onend = () => {
                if (status === 'listening') setStatus('idle');
            };

            recognition.start();
        } else {
            // Fallback: gravar com MediaRecorder
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder.current = new MediaRecorder(stream);
                audioChunks.current = [];

                mediaRecorder.current.ondataavailable = (e) => {
                    if (e.data.size > 0) audioChunks.current.push(e.data);
                };

                mediaRecorder.current.onstop = async () => {
                    stream.getTracks().forEach(t => t.stop());
                    setStatus('idle');
                };

                mediaRecorder.current.start();
                setStatus('listening');
            } catch {
                alert('Permissão de microfone negada');
            }
        }
    }, [status, sendMessageToClaude]);

    const stopVoiceInput = useCallback(() => {
        if (mediaRecorder.current?.state === 'recording') {
            mediaRecorder.current.stop();
        }
        setStatus('idle');
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessageToClaude(inputText);
        }
    };

    const orbColor = {
        idle: '#00f2ff',
        listening: '#00ff88',
        thinking: '#f59e0b',
        speaking: '#8b5cf6',
    }[status];

    const statusLabel = {
        idle: 'Pronto',
        listening: 'Ouvindo...',
        thinking: 'Pensando...',
        speaking: 'Respondendo...',
    }[status];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        >
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/90 backdrop-blur-xl"
                onClick={onClose}
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                transition={{ type: 'spring', damping: 20 }}
                className="relative w-full max-w-2xl h-[85vh] flex flex-col"
                style={{ background: 'linear-gradient(135deg, #050510 0%, #0a0a1a 100%)', borderRadius: 24, border: '1px solid rgba(0,242,255,0.15)' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="relative w-12 h-12 flex items-center justify-center">
                            <motion.div
                                className="absolute inset-0 rounded-full"
                                style={{ background: `radial-gradient(circle, ${orbColor}40, transparent 70%)` }}
                                animate={{ scale: status !== 'idle' ? [1, 1.3, 1] : 1 }}
                                transition={{ repeat: status !== 'idle' ? Infinity : 0, duration: 1.5 }}
                            />
                            <Zap className="w-6 h-6 relative z-10" style={{ color: orbColor }} />
                        </div>
                        <div>
                            <h2 className="font-black text-xl tracking-widest uppercase" style={{ color: orbColor }}>
                                {agent.name}
                            </h2>
                            <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider">{statusLabel}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-full transition-colors text-zinc-400 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* ORB Central */}
                <div className="flex justify-center items-center py-6">
                    <div className="relative flex items-center justify-center w-32 h-32">
                        {/* Rings */}
                        {[1, 2, 3].map(i => (
                            <motion.div
                                key={i}
                                className="absolute rounded-full border"
                                style={{
                                    width: 32 + i * 28,
                                    height: 32 + i * 28,
                                    borderColor: `${orbColor}${status !== 'idle' ? '40' : '15'}`,
                                }}
                                animate={status !== 'idle' ? {
                                    scale: [1, 1 + i * 0.05, 1],
                                    opacity: [0.8, 0.3, 0.8],
                                } : { scale: 1, opacity: 0.2 }}
                                transition={{ repeat: Infinity, duration: 1.5 + i * 0.3, delay: i * 0.2 }}
                            />
                        ))}

                        {/* Core */}
                        <motion.div
                            className="w-16 h-16 rounded-full flex items-center justify-center"
                            style={{ background: `radial-gradient(circle, ${orbColor}60 0%, ${orbColor}20 60%, transparent 100%)` }}
                            animate={status !== 'idle' ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                        >
                            <Brain className="w-7 h-7" style={{ color: orbColor }} />
                        </motion.div>

                        {/* Waveform */}
                        <div className="absolute -bottom-8 flex gap-0.5 items-end h-8">
                            {waveValues.map((h, i) => (
                                <motion.div
                                    key={i}
                                    className="w-1 rounded-full"
                                    style={{ height: `${h}px`, backgroundColor: orbColor, opacity: 0.8 }}
                                    transition={{ duration: 0.08 }}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 mt-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 transparent' }}>
                    <AnimatePresence>
                        {messages.map((msg, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                        ? 'bg-blue-600/20 border border-blue-500/30 text-white'
                                        : 'bg-white/5 border border-white/10 text-zinc-200'
                                        }`}
                                >
                                    {msg.content}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {status === 'thinking' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex justify-start"
                        >
                            <div className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 flex gap-1">
                                {[0, 1, 2].map(i => (
                                    <motion.div
                                        key={i}
                                        className="w-2 h-2 rounded-full bg-zinc-400"
                                        animate={{ y: [0, -6, 0] }}
                                        transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-white/5">
                    <div className="flex gap-3 items-end">
                        {/* Mic Button */}
                        <button
                            onClick={status === 'listening' ? stopVoiceInput : startVoiceInput}
                            disabled={status === 'thinking' || status === 'speaking'}
                            className={`p-3 rounded-xl flex-shrink-0 transition-all ${status === 'listening'
                                ? 'bg-red-500/20 border border-red-500/50 text-red-400 animate-pulse'
                                : 'bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:border-white/20'
                                } disabled:opacity-30`}
                        >
                            {status === 'listening' ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        </button>

                        <div className="flex-1 flex items-end gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus-within:border-cyan-500/30 transition-colors">
                            <textarea
                                value={inputText}
                                onChange={e => setInputText(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Digite ou use o microfone..."
                                rows={1}
                                disabled={status === 'thinking'}
                                className="flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-600 resize-none outline-none disabled:opacity-50"
                                style={{ maxHeight: 120 }}
                            />
                            <button
                                onClick={() => sendMessageToClaude(inputText)}
                                disabled={!inputText.trim() || status !== 'idle'}
                                className="p-1.5 rounded-lg text-cyan-400 hover:text-cyan-300 disabled:opacity-30 transition-colors"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <p className="text-center text-[10px] text-zinc-600 mt-2 font-mono">
                        Powered by Claude 3.5 Sonnet • Funciona 100% em produção
                    </p>
                </div>
            </motion.div>
        </motion.div>
    );
}
