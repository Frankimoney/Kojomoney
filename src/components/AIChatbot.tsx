'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Send, Bot, User, Loader2, Sparkles } from 'lucide-react'
import { apiCall } from '@/lib/api-client'

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
}

// Format message content with line breaks and basic styling
function FormattedMessage({ content, isUser }: { content: string; isUser: boolean }) {
    // Split by double newlines for paragraphs, single newlines for line breaks
    const lines = content.split('\n')

    return (
        <div className={`space-y-1 ${isUser ? 'text-white' : 'text-foreground'}`}>
            {lines.map((line, i) => {
                if (!line.trim()) return <div key={i} className="h-1" />

                // Handle bullet points
                if (line.trim().startsWith('-') || line.trim().startsWith('•')) {
                    return (
                        <div key={i} className="flex gap-2 text-sm">
                            <span>•</span>
                            <span>{line.replace(/^[-•]\s*/, '')}</span>
                        </div>
                    )
                }

                // Handle numbered lists
                if (/^\d+\./.test(line.trim())) {
                    return (
                        <div key={i} className="text-sm pl-1">
                            {line}
                        </div>
                    )
                }

                return <p key={i} className="text-sm">{line}</p>
            })}
        </div>
    )
}

export default function AIChatbot() {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: "Hi there! 👋 I'm KojoBot, your AI assistant. How can I help you today?",
            timestamp: new Date()
        }
    ])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // Auto-scroll to bottom when messages change
    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages, isLoading])

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100)
        }
    }, [isOpen])

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim(),
            timestamp: new Date()
        }

        setMessages(prev => [...prev, userMessage])
        setInput('')
        setIsLoading(true)

        try {
            // Prepare history for context (exclude welcome message)
            const history = messages
                .filter(m => m.id !== 'welcome')
                .map(m => ({ role: m.role, content: m.content }))

            const response = await apiCall('/api/chat', {
                method: 'POST',
                body: JSON.stringify({
                    message: userMessage.content,
                    history
                })
            })

            const data = await response.json()

            if (data.reply) {
                const botMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: data.reply,
                    timestamp: new Date()
                }
                setMessages(prev => [...prev, botMessage])
            } else {
                throw new Error(data.error || 'No response')
            }
        } catch (error) {
            console.error('Chat error:', error)
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "Sorry, I'm having trouble connecting. Please try again or contact admin@kojomoney.com for help.",
                timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMessage])
        } finally {
            setIsLoading(false)
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    const quickQuestions = [
        "How do I earn?",
        "How to withdraw?",
        "What's Lucky Spin?"
    ]

    return (
        <>
            {/* Floating Chat Button */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="fixed bottom-20 right-4 z-50"
                    >
                        <Button
                            onClick={() => setIsOpen(true)}
                            className="h-14 w-14 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-500/30"
                        >
                            <MessageCircle className="h-6 w-6" />
                        </Button>
                        {/* Pulse effect */}
                        <span className="absolute top-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 100, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 100, scale: 0.9 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-[380px] z-50"
                    >
                        <Card className="flex flex-col h-[70vh] max-h-[600px] shadow-2xl border-0 overflow-hidden">
                            {/* Header */}
                            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 text-white shrink-0">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center">
                                            <Sparkles className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold">KojoBot</h3>
                                            <p className="text-xs text-purple-200">AI Support Assistant</p>
                                        </div>
                                    </div>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => setIsOpen(false)}
                                        className="h-8 w-8 text-white hover:bg-white/20"
                                    >
                                        <X className="h-5 w-5" />
                                    </Button>
                                </div>
                            </div>

                            {/* Messages - Scrollable */}
                            <div
                                ref={scrollContainerRef}
                                className="flex-1 overflow-y-auto p-4 space-y-4"
                            >
                                {messages.map((msg) => (
                                    <motion.div
                                        key={msg.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        {msg.role === 'assistant' && (
                                            <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0 mt-1">
                                                <Bot className="h-4 w-4 text-purple-600" />
                                            </div>
                                        )}
                                        <div
                                            className={`max-w-[85%] p-3 rounded-2xl ${msg.role === 'user'
                                                    ? 'bg-purple-600 text-white rounded-br-sm'
                                                    : 'bg-muted rounded-bl-sm'
                                                }`}
                                        >
                                            <FormattedMessage content={msg.content} isUser={msg.role === 'user'} />
                                        </div>
                                        {msg.role === 'user' && (
                                            <div className="h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center shrink-0 mt-1">
                                                <User className="h-4 w-4 text-white" />
                                            </div>
                                        )}
                                    </motion.div>
                                ))}

                                {isLoading && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="flex gap-2"
                                    >
                                        <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                            <Bot className="h-4 w-4 text-purple-600" />
                                        </div>
                                        <div className="bg-muted p-3 rounded-2xl rounded-bl-sm flex items-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                                            <span className="text-sm text-muted-foreground">Thinking...</span>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Quick Questions - Only show at start */}
                                {messages.length === 1 && (
                                    <div className="space-y-2 pt-2">
                                        <p className="text-xs text-muted-foreground">Quick questions:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {quickQuestions.map((q, i) => (
                                                <Button
                                                    key={i}
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-xs h-auto py-1.5 px-3"
                                                    onClick={() => {
                                                        setInput(q)
                                                        setTimeout(() => sendMessage(), 100)
                                                    }}
                                                >
                                                    {q}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Invisible element for scroll-to-bottom */}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div className="p-3 border-t bg-background shrink-0">
                                <div className="flex gap-2">
                                    <Input
                                        ref={inputRef}
                                        placeholder="Type your question..."
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={handleKeyPress}
                                        disabled={isLoading}
                                        className="flex-1"
                                    />
                                    <Button
                                        onClick={sendMessage}
                                        disabled={!input.trim() || isLoading}
                                        className="bg-purple-600 hover:bg-purple-700"
                                    >
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </div>
                                <p className="text-[10px] text-muted-foreground text-center mt-2">
                                    Powered by AI
                                </p>
                            </div>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
