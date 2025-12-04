import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export const ChatbotView: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Olá! Sou seu assistente de qualidade da água. Como posso ajudar você hoje?',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const suggestedQuestions = [
    'Qual a faixa ideal de pH para meu viveiro?',
    'Como melhorar a qualidade da água?',
    'O que significa turbidez alta?'
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputText]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    // Adiciona mensagem do usuário
    const userMessage: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // Simula delay de resposta da LLM
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock de resposta - substituir por chamada real à API da LLM
    const botResponse = generateMockResponse(text);
    
    const botMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: botResponse,
      sender: 'bot',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, botMessage]);
    setIsTyping(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputText);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header do Chat */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-4 text-white">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-full">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3>Assistente Inteligente</h3>
            <p className="text-xs opacity-90">Tire suas dúvidas sobre qualidade da água</p>
          </div>
        </div>
      </div>

      {/* Sugestões de Perguntas */}
      {messages.length <= 1 && (
        <div className="p-4 bg-gradient-to-b from-gray-50 to-white border-b border-gray-100">
          <p className="text-xs text-gray-500 mb-3">Sugestões de perguntas:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(question)}
                className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-700 hover:border-teal-500 hover:text-teal-600 transition-all hover:shadow-sm"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Área de Mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start gap-3 ${
              message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            {/* Avatar */}
            <div className={`
              flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
              ${message.sender === 'bot' 
                ? 'bg-gradient-to-br from-teal-500 to-cyan-600' 
                : 'bg-gray-300'
              }
            `}>
              {message.sender === 'bot' ? (
                <Bot className="w-5 h-5 text-white" />
              ) : (
                <User className="w-5 h-5 text-gray-600" />
              )}
            </div>

            {/* Balão de Mensagem */}
            <div className={`
              max-w-[75%] rounded-2xl px-4 py-3
              ${message.sender === 'bot'
                ? 'bg-gray-100 text-gray-800 rounded-tl-none'
                : 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-tr-none'
              }
            `}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
              <p className={`text-xs mt-1 ${
                message.sender === 'bot' ? 'text-gray-400' : 'text-white/70'
              }`}>
                {message.timestamp.toLocaleTimeString('pt-BR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
          </div>
        ))}

        {/* Indicador de digitação */}
        {isTyping && (
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="bg-gray-100 rounded-2xl rounded-tl-none px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input de Mensagem */}
      <div className="p-4 border-t border-gray-100 bg-white">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua pergunta..."
            className="flex-1 resize-none overflow-hidden px-4 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm max-h-32"
            rows={1}
            disabled={isTyping}
          />
          <button
            onClick={() => handleSendMessage(inputText)}
            disabled={!inputText.trim() || isTyping}
            className="flex-shrink-0 bg-gradient-to-r from-teal-600 to-cyan-600 text-white p-3 rounded-xl hover:from-teal-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
            aria-label="Enviar mensagem"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Pressione Enter para enviar, Shift+Enter para nova linha
        </p>
      </div>
    </div>
  );
};

/**
 * Mock de resposta da LLM - substituir por chamada real à API
 * 
 * IMPLEMENTAÇÃO REAL:
 * 
 * const generateResponse = async (userMessage: string): Promise<string> => {
 *   const response = await fetch('https://seu-backend.com/api/chat', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ 
 *       message: userMessage,
 *       context: 'aquicultura' // contexto para melhor resposta
 *     })
 *   });
 *   const data = await response.json();
 *   return data.response;
 * };
 */
const generateMockResponse = (userMessage: string): string => {
  const lowerMessage = userMessage.toLowerCase();

  if (lowerMessage.includes('ph')) {
    return 'A faixa ideal de pH para criação de peixes é entre 6.5 e 8.5. Valores muito baixos (ácidos) ou muito altos (alcalinos) podem causar estresse nos peixes e afetar sua saúde. Recomendo monitorar diariamente e ajustar com produtos específicos se necessário.';
  }

  if (lowerMessage.includes('turbidez')) {
    return 'A turbidez mede a quantidade de partículas suspensas na água. Valores ideais ficam entre 0-10 NTU. Turbidez alta pode indicar excesso de matéria orgânica, algas ou sedimentos. Isso reduz a entrada de luz e pode diminuir o oxigênio dissolvido. Considere melhorar a filtragem ou reduzir a alimentação.';
  }

  if (lowerMessage.includes('temperatura')) {
    return 'A temperatura ideal varia conforme a espécie, mas geralmente fica entre 20°C e 30°C. Temperaturas fora dessa faixa podem causar estresse, reduzir o apetite e comprometer o sistema imunológico dos peixes. Use aeradores ou sombreamento para controlar a temperatura.';
  }

  if (lowerMessage.includes('tds') || lowerMessage.includes('condutividade')) {
    return 'O TDS (Total de Sólidos Dissolvidos) mede a condutividade elétrica da água, indicando a quantidade de minerais dissolvidos. Valores entre 0-500 ppm são ideais para a maioria das espécies. Muito baixo pode indicar falta de nutrientes, muito alto pode ser tóxico.';
  }

  if (lowerMessage.includes('melhorar') || lowerMessage.includes('qualidade')) {
    return 'Para melhorar a qualidade da água:\n\n1. Mantenha aeração adequada\n2. Evite excesso de alimentação\n3. Realize trocas parciais regulares\n4. Monitore parâmetros diariamente\n5. Use probióticos quando necessário\n6. Mantenha densidade adequada de peixes\n\nQual parâmetro específico está fora do ideal?';
  }

  // Resposta padrão
  return 'Entendo sua dúvida. Posso ajudar com informações sobre pH, temperatura, turbidez, TDS e outros parâmetros de qualidade da água. Você pode fazer perguntas mais específicas sobre algum desses temas?';
};
