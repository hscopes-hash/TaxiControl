'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Mic,
  MicOff,
  Send,
  Bot,
  User,
  Volume2,
  VolumeX,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

// ── Types ────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isTranscription?: boolean;
}

// ── Utility ──────────────────────────────────────────────
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ── WELCOME MESSAGE ──────────────────────────────────────
const WELCOME_MSG: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: 'Olá! Sou seu co-piloto do sistema TaxiControl Pro. Estou aqui para ajudar você a consultar dados dos motoristas, acompanhar corridas em andamento, verificar relatórios e muito mais. O que gostaria de saber?',
  timestamp: new Date(),
};

// ══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════
export default function CoPilotChat() {
  // ── State ───────────────────────────────────────────
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const hasGreeted = useRef(false);

  // ── Auto-scroll on new message ─────────────────────
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // ── Speak text using Web Speech API (nativo do navegador) ──
  const speakText = useCallback((text: string) => {
    if (!soundEnabled || typeof window === 'undefined') return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Strip markdown-like formatting for cleaner speech
    const cleanText = text
      .replace(/\*\*/g, '')
      .replace(/#{1,6}\s/g, '')
      .replace(/```[\s\S]*?```/g, 'código omitido.')
      .replace(/[•\-]\s/g, '')
      .replace(/\n+/g, '. ')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to find a Portuguese voice
    const voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find(
      (v) => v.lang.startsWith('pt') || v.lang.startsWith('pt-BR')
    );
    if (ptVoice) {
      utterance.voice = ptVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [soundEnabled]);

  // ── Stop speaking ──────────────────────────────────
  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  // ── Preload voices ─────────────────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  // ── Greeting on first open ─────────────────────────
  const handleOpen = useCallback(() => {
    setIsOpen(true);
    if (!hasGreeted.current) {
      hasGreeted.current = true;
      setMessages([WELCOME_MSG]);
      setTimeout(() => speakText(WELCOME_MSG.content), 800);
    }
  }, [speakText]);

  // ── Send message to AI ────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isProcessing) return;

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
      isTranscription: false,
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsProcessing(true);
    stopSpeaking();

    try {
      const chatHistory = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          history: chatHistory,
        }),
      });

      const data = await res.json();
      const aiResponse = data.response || 'Desculpe, não consegui processar sua pergunta.';

      const assistantMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMsg]);
      setTimeout(() => speakText(aiResponse), 300);
    } catch {
      const errorMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro de conexão. Tente novamente.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, messages, speakText, stopSpeaking]);

  // ── Audio Recording → ASR ─────────────────────────
  const startRecording = useCallback(async () => {
    // Verificar suporte a microfone
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error('Microfone não suportado. Use a digitação para enviar mensagens.', {
        duration: 5000,
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        if (audioChunksRef.current.length === 0) return;

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          if (!base64Audio) return;

          setIsProcessing(true);
          try {
            const res = await fetch('/api/copilot/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audio_base64: base64Audio }),
            });

            const data = await res.json();
            const transcription = data.transcription || '';

            if (transcription.trim()) {
              const userMsg: ChatMessage = {
                id: generateId(),
                role: 'user',
                content: transcription.trim(),
                timestamp: new Date(),
                isTranscription: true,
              };
              setMessages(prev => [...prev, userMsg]);

              const chatHistory = messages
                .filter(m => m.id !== 'welcome')
                .map(m => ({ role: m.role, content: m.content }));

              const aiRes = await fetch('/api/copilot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  message: transcription.trim(),
                  history: chatHistory,
                }),
              });

              const aiData = await aiRes.json();
              const aiResponse = aiData.response || 'Desculpe, não consegui processar.';

              const assistantMsg: ChatMessage = {
                id: generateId(),
                role: 'assistant',
                content: aiResponse,
                timestamp: new Date(),
              };

              setMessages(prev => [...prev, assistantMsg]);
              setTimeout(() => speakText(aiResponse), 300);
            } else if (data.warning) {
              toast.warning(data.warning);
            }
          } catch {
            toast.error('Erro ao processar áudio. Tente digitar.');
          } finally {
            setIsProcessing(false);
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: unknown) {
      const error = err as DOMException;
      const name = error?.name || '';
      const msg = error?.message || '';

      if (
        name === 'NotAllowedError' ||
        name === 'PermissionDeniedError' ||
        msg.includes('Permission') ||
        msg.includes('denied')
      ) {
        toast.error(
          'Permissão de microfone negada. Acesse as configurações do site no Chrome (cadeado 🔒) e permita o microfone.',
          { duration: 8000 }
        );
      } else if (
        name === 'NotFoundError' ||
        name === 'DevicesNotFoundError' ||
        msg.includes('device') ||
        msg.includes('not found')
      ) {
        toast.error(
          'Nenhum microfone encontrado. Verifique se o dispositivo tem um microfone.',
          { duration: 6000 }
        );
      } else if (
        name === 'NotReadableError' ||
        name === 'AbortError' ||
        msg.includes('secure') ||
        msg.includes('SSL') ||
        msg.includes('HTTPS')
      ) {
        toast.error(
          'Microfone requer conexão segura (HTTPS). No Android, abra o app pelo Chrome como "Instalar na tela inicial" para ter HTTPS.',
          { duration: 8000 }
        );
      } else {
        toast.error(`Erro ao acessar o microfone: ${msg || 'Erro desconhecido'}. Tente digitar.`, {
          duration: 6000,
        });
      }
    }
  }, [messages, speakText]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      stopSpeaking();
      startRecording();
    }
  }, [isRecording, stopRecording, startRecording, stopSpeaking]);

  // ── Submit on Enter ───────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputText);
  };

  // ── Cleanup speech on unmount ─────────────────────
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // ── Render ────────────────────────────────────────
  return (
    <>
      {/* ── Floating Mic Button ──────────────────────── */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleOpen}
            className="fixed bottom-24 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-500/30 transition-shadow hover:shadow-xl hover:shadow-amber-500/40 md:bottom-6 md:right-6"
            aria-label="Abrir Co-Piloto IA"
          >
            {isSpeaking ? (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <Volume2 className="h-6 w-6" />
              </motion.div>
            ) : (
              <Mic className="h-6 w-6" />
            )}
            <span className="absolute inset-0 animate-ping rounded-full bg-amber-400 opacity-20" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Chat Sheet ──────────────────────────────── */}
      <Sheet open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) stopSpeaking();
      }}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
        >
          {/* ── Header ──────────────────────────────── */}
          <SheetHeader className="border-b bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <SheetTitle className="text-left text-base font-bold text-white">
                    Co-Piloto IA
                  </SheetTitle>
                  <p className="text-xs text-amber-100/80">
                    Assistente inteligente do TaxiControl
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="h-8 w-8 text-white hover:bg-white/20"
                aria-label={soundEnabled ? 'Desativar voz' : 'Ativar voz'}
              >
                {soundEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </Button>
            </div>
          </SheetHeader>

          {/* ── Messages Area ────────────────────────── */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto bg-gray-50 px-4 py-4"
          >
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`mb-4 flex gap-2.5 ${
                  msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    msg.role === 'assistant'
                      ? 'bg-amber-500 text-white'
                      : 'bg-gray-700 text-white'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <Bot className="h-4 w-4" />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'assistant'
                      ? 'rounded-tl-md bg-white text-gray-800 shadow-sm border border-gray-100'
                      : 'rounded-tr-md bg-amber-500 text-white'
                  }`}
                >
                  {msg.role === 'user' && msg.isTranscription && (
                    <div className="mb-1 flex items-center gap-1 opacity-75">
                      <Mic className="h-3 w-3" />
                      <span className="text-[10px] font-medium uppercase tracking-wider">
                        Mensagem de voz
                      </span>
                    </div>
                  )}
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <p
                    className={`mt-1 text-[10px] ${
                      msg.role === 'assistant'
                        ? 'text-gray-400'
                        : 'text-amber-200'
                    }`}
                  >
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              </motion.div>
            ))}

            {/* Processing indicator */}
            {isProcessing && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 flex gap-2.5"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-2xl rounded-tl-md bg-white px-4 py-3 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          animate={{ y: [0, -4, 0] }}
                          transition={{
                            repeat: Infinity,
                            duration: 0.6,
                            delay: i * 0.15,
                          }}
                          className="h-2 w-2 rounded-full bg-amber-400"
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-400">
                      {isRecording ? 'Ouvindo...' : 'Pensando...'}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* ── Input Area ───────────────────────────── */}
          <div className="border-t bg-white px-3 py-3">
            {isRecording && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-2 flex items-center justify-center gap-2"
              >
                <div className="flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5">
                  <motion.div
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                    className="h-2.5 w-2.5 rounded-full bg-red-500"
                  />
                  <span className="text-xs font-medium text-red-600">
                    Gravando... Fale agora
                  </span>
                </div>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Digite sua pergunta..."
                disabled={isProcessing}
                className="h-10 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20 disabled:opacity-50"
              />

              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleRecording}
                disabled={isProcessing && !isRecording}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                  isRecording
                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/25'
                    : 'bg-amber-500 text-white shadow-lg shadow-amber-500/25 hover:bg-amber-600'
                } disabled:opacity-50`}
                aria-label={isRecording ? 'Parar gravação' : 'Iniciar gravação'}
              >
                {isRecording ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </motion.button>

              <motion.button
                type="submit"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={!inputText.trim() || isProcessing}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-900 text-white shadow-lg disabled:opacity-40"
                aria-label="Enviar mensagem"
              >
                <Send className="h-4 w-4" />
              </motion.button>
            </form>

            <p className="mt-1.5 text-center text-[10px] text-gray-400">
              Clique no 🎤 para falar ou digite sua pergunta
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
