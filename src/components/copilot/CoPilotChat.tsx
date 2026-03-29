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
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

// ── Tipos ────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isTranscription?: boolean;
}

// ── Utilitários ──────────────────────────────────────────
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function stripEmojis(text: string): string {
  return text
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')
    .replace(/[\u{200D}]/gu, '')
    .replace(/[\u{20E3}]/gu, '')
    .replace(/[\u{E0020}-\u{E007F}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ── Mensagem de boas-vindas ─────────────────────────────
const WELCOME_MSG: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: 'Olá! Sou seu co-piloto do sistema TaxiControl Pro. Estou aqui para ajudar você a consultar dados dos motoristas, acompanhar corridas em andamento, verificar relatórios e muito mais. O que gostaria de saber?',
  timestamp: new Date(),
};

// ── Constantes ────────────────────────────────────────────
const ASR_TIMEOUT_MS = 15000;

// ══════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════
export default function CoPilotChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [interimText, setInterimText] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const hasGreeted = useRef(false);
  const resultReceivedRef = useRef(false);
  const asrTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const ttsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ── Auto-scroll ──────────────────────────────────────
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, interimText]);

  // ── Carregar vozes ──────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        voicesRef.current = voices;
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    const delayedLoad = setTimeout(loadVoices, 500);
    return () => {
      clearTimeout(delayedLoad);
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // ── Falar texto (Web Speech API) ────────────────────
  const speakText = useCallback((text: string) => {
    if (!soundEnabled || typeof window === 'undefined') return;

    const cleanText = stripEmojis(text
      .replace(/\*\*/g, '')
      .replace(/#{1,6}\s/g, '')
      .replace(/```[\s\S]*?```/g, 'código omitido.')
      .replace(/[•\-]\s/g, '')
      .replace(/\n+/g, '. ')
      .trim());

    if (!cleanText) return;

    // Limpar timer anterior
    if (ttsTimeoutRef.current) clearTimeout(ttsTimeoutRef.current);

    // Cancelar fala anterior
    window.speechSynthesis.cancel();

    // Obter melhor voz disponível
    const voices = voicesRef.current.length > 0
      ? voicesRef.current
      : window.speechSynthesis.getVoices();

    const ptVoice = voices.find(v => v.lang === 'pt-BR') ||
      voices.find(v => v.lang.startsWith('pt')) || null;

    // Falar com delay para o Chrome mobile não ignorar
    ttsTimeoutRef.current = setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      if (ptVoice) {
        utterance.voice = ptVoice;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    }, 200);
  }, [soundEnabled]);

  const stopSpeaking = useCallback(() => {
    if (ttsTimeoutRef.current) {
      clearTimeout(ttsTimeoutRef.current);
      ttsTimeoutRef.current = null;
    }
    if (typeof window !== 'undefined') {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  // ── Saudação ────────────────────────────────────────
  const handleOpen = useCallback(() => {
    setIsOpen(true);
    if (!hasGreeted.current) {
      hasGreeted.current = true;
      setMessages([WELCOME_MSG]);
      setTimeout(() => speakText(WELCOME_MSG.content), 1000);
    }
  }, [speakText]);

  // ── Consultar IA ────────────────────────────────────
  const queryAI = useCallback(async (
    text: string,
    currentMessages: ChatMessage[],
  ): Promise<string | null> => {
    try {
      const chatHistory = currentMessages
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: chatHistory }),
      });

      const data = await res.json();
      return stripEmojis(data.response || 'Desculpe, não consegui processar sua pergunta.');
    } catch (err) {
      console.error('Erro ao consultar IA:', err);
      return null;
    }
  }, []);

  // ── Enviar mensagem (texto) ─────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isProcessing) return;

    const userMsg: ChatMessage = {
      id: generateId(), role: 'user', content: text.trim(),
      timestamp: new Date(), isTranscription: false,
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsProcessing(true);
    stopSpeaking();

    const aiResponse = await queryAI(text.trim(), messages);

    if (aiResponse) {
      const assistantMsg: ChatMessage = {
        id: generateId(), role: 'assistant', content: aiResponse,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
      setTimeout(() => speakText(aiResponse), 400);
    } else {
      setMessages(prev => [...prev, {
        id: generateId(), role: 'assistant',
        content: 'Desculpe, ocorreu um erro de conexão. Tente novamente.',
        timestamp: new Date(),
      }]);
    }
    setIsProcessing(false);
  }, [isProcessing, messages, speakText, stopSpeaking, queryAI]);

  // ── Fechar painel ───────────────────────────────────
  const handleClose = useCallback(() => {
    stopSpeaking();
    clearASRTimeout();
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    setIsRecording(false);
    setInterimText('');
    setIsOpen(false);
  }, [stopSpeaking]);

  // ── Timeout do ASR ──────────────────────────────────
  const clearASRTimeout = () => {
    if (asrTimeoutRef.current) {
      clearTimeout(asrTimeoutRef.current);
      asrTimeoutRef.current = null;
    }
  };

  const setASRTimeout = () => {
    clearASRTimeout();
    asrTimeoutRef.current = setTimeout(() => {
      console.warn('ASR timeout');
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
        recognitionRef.current = null;
      }
    }, ASR_TIMEOUT_MS);
  };

  // ── Iniciar reconhecimento de voz ───────────────────
  const startRecording = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error('Reconhecimento de voz não suportado. Use Chrome ou digite.', { duration: 5000 });
      return;
    }

    // Limpar reconhecimento anterior
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    resultReceivedRef.current = false;
    setInterimText('');

    recognition.onstart = () => {
      console.log('ASR iniciado');
      setIsRecording(true);
      setASRTimeout();
    };

    recognition.onresult = async (event: any) => {
      clearASRTimeout();

      const lastResultIndex = event.results.length - 1;
      const result = event.results[lastResultIndex];

      if (result.isFinal) {
        resultReceivedRef.current = true;
        setIsRecording(false);
        setInterimText('');

        const transcript = result[0]?.transcript || '';

        if (!transcript.trim()) {
          toast.warning('Não consegui entender. Fale mais claro ou digite.', { duration: 3000 });
          return;
        }

        console.log('ASR resultado:', transcript);
        setIsProcessing(true);

        const userMsg: ChatMessage = {
          id: generateId(), role: 'user', content: transcript.trim(),
          timestamp: new Date(), isTranscription: true,
        };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);

        // Parar qualquer fala antes de consultar a IA
        stopSpeaking();

        const aiResponse = await queryAI(transcript.trim(), newMessages);

        if (aiResponse) {
          const assistantMsg: ChatMessage = {
            id: generateId(), role: 'assistant', content: aiResponse,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, assistantMsg]);
          // Delay maior após ASR para o Chrome mobile liberar o áudio
          setTimeout(() => speakText(aiResponse), 1000);
        } else {
          setMessages(prev => [...prev, {
            id: generateId(), role: 'assistant',
            content: 'Desculpe, ocorreu um erro de conexão. Tente novamente.',
            timestamp: new Date(),
          }]);
        }
        setIsProcessing(false);
      } else {
        // Resultado provisório - mostrar em tempo real
        const interim = result[0]?.transcript || '';
        setInterimText(interim);
        setASRTimeout();
      }
    };

    recognition.onerror = (event: any) => {
      clearASRTimeout();
      setIsRecording(false);
      setInterimText('');
      recognitionRef.current = null;

      const errorType = event.error || '';
      console.warn('ASR erro:', errorType);

      if (errorType === 'not-allowed' || errorType === 'service-not-allowed') {
        toast.error('Permissão de microfone negada. Toque no cadeado na barra de endereço e permita o microfone para este site.', { duration: 8000 });
      } else if (errorType === 'no-speech') {
        toast.warning('Nenhuma fala detectada. Fale mais próximo do microfone.', { duration: 4000 });
      } else if (errorType === 'audio-capture') {
        toast.error('Nenhum microfone encontrado no dispositivo.', { duration: 5000 });
      } else if (errorType === 'network') {
        toast.error('Erro de rede no reconhecimento de voz. Verifique sua conexão.', { duration: 5000 });
      } else if (errorType === 'aborted') {
        // Interrompido pelo usuário, sem erro
      } else {
        toast.error(`Erro de voz: ${errorType || 'desconhecido'}`, { duration: 5000 });
      }
    };

    recognition.onend = () => {
      clearASRTimeout();
      setIsRecording(false);
      setInterimText('');
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err: any) {
      console.error('ASR erro ao iniciar:', err);
      setIsRecording(false);
      toast.error('Erro ao iniciar microfone. Tente novamente.', { duration: 5000 });
    }
  }, [messages, speakText, queryAI, isProcessing, stopSpeaking]);

  const stopRecording = useCallback(() => {
    clearASRTimeout();
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    setIsRecording(false);
    setInterimText('');
  }, []);

  const toggleRecording = useCallback(() => {
    if (isProcessing) return;
    if (isRecording) {
      stopRecording();
    } else {
      // Não chamar stopSpeaking aqui! No Chrome mobile,
      // speechSynthesis.cancel() interfere com o ASR
      startRecording();
    }
  }, [isRecording, isProcessing, stopRecording, startRecording]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputText);
  };

  // ── Limpeza ─────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (asrTimeoutRef.current) clearTimeout(asrTimeoutRef.current);
      if (ttsTimeoutRef.current) clearTimeout(ttsTimeoutRef.current);
      window.speechSynthesis?.cancel();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    };
  }, []);

  // ── Renderizar ──────────────────────────────────────
  return (
    <>
      {/* Botão flutuante do microfone */}
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
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                <Volume2 className="h-6 w-6" />
              </motion.div>
            ) : (
              <Mic className="h-6 w-6" />
            )}
            <span className="absolute inset-0 animate-ping rounded-full bg-amber-400 opacity-20" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Painel de chat */}
      <Sheet open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); else setIsOpen(true); }}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          {/* Cabeçalho */}
          <SheetHeader className="border-b bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <SheetTitle className="text-left text-base font-bold text-white">Co-Piloto IA</SheetTitle>
                  <p className="text-xs text-amber-100/80">Assistente do TaxiControl</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSoundEnabled(prev => !prev);
                    if (soundEnabled) stopSpeaking();
                  }}
                  className="h-9 w-9 text-white hover:bg-white/20"
                  aria-label={soundEnabled ? 'Desativar voz' : 'Ativar voz'}
                >
                  {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="h-9 w-9 text-white hover:bg-white/20"
                  aria-label="Fechar"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </SheetHeader>

          {/* Mensagens */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto bg-gray-50 px-4 py-4">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`mb-4 flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${msg.role === 'assistant' ? 'bg-amber-500 text-white' : 'bg-gray-700 text-white'}`}>
                  {msg.role === 'assistant' ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                </div>
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${msg.role === 'assistant' ? 'rounded-tl-md bg-white text-gray-800 shadow-sm border border-gray-100' : 'rounded-tr-md bg-amber-500 text-white'}`}>
                  {msg.role === 'user' && msg.isTranscription && (
                    <div className="mb-1 flex items-center gap-1 opacity-75">
                      <Mic className="h-3 w-3" />
                      <span className="text-[10px] font-medium uppercase tracking-wider">Voz</span>
                    </div>
                  )}
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <p className={`mt-1 text-[10px] ${msg.role === 'assistant' ? 'text-gray-400' : 'text-amber-200'}`}>
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              </motion.div>
            ))}

            {/* Texto provisório (feedback em tempo real) */}
            {interimText && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 0.7, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-4 flex gap-2.5 flex-row-reverse"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-700 text-white">
                  <User className="h-4 w-4" />
                </div>
                <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-amber-400/60 px-3.5 py-2.5 text-sm text-white italic">
                  <div className="flex items-center gap-1 mb-1 opacity-75">
                    <Mic className="h-3 w-3" />
                    <span className="text-[10px] font-medium uppercase tracking-wider">Ouvindo...</span>
                  </div>
                  <p>{interimText}</p>
                </div>
              </motion.div>
            )}

            {/* Indicador de processamento */}
            {isProcessing && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 flex gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-2xl rounded-tl-md bg-white px-4 py-3 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div key={i} animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }} className="h-2 w-2 rounded-full bg-amber-400" />
                      ))}
                    </div>
                    <span className="text-xs text-gray-400">Pensando...</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Entrada */}
          <div className="border-t bg-white px-3 py-3">
            {isRecording && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-2 flex items-center justify-center gap-2">
                <div className="flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5">
                  <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} className="h-2.5 w-2.5 rounded-full bg-red-500" />
                  <span className="text-xs font-medium text-red-600">Gravando... Fale agora</span>
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
                disabled={isProcessing || isRecording}
                className="h-10 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20 disabled:opacity-50"
              />
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleRecording}
                disabled={isProcessing && !isRecording}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${isRecording ? 'bg-red-500 text-white shadow-lg shadow-red-500/25' : 'bg-amber-500 text-white shadow-lg shadow-amber-500/25 hover:bg-amber-600'} disabled:opacity-50`}
                aria-label={isRecording ? 'Parar gravação' : 'Iniciar gravação'}
              >
                {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </motion.button>
              <motion.button
                type="submit"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={!inputText.trim() || isProcessing || isRecording}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-900 text-white shadow-lg disabled:opacity-40"
                aria-label="Enviar mensagem"
              >
                <Send className="h-4 w-4" />
              </motion.button>
            </form>

            <p className="mt-1.5 text-center text-[10px] text-gray-400">
              Clique no microfone para falar ou digite sua pergunta
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
