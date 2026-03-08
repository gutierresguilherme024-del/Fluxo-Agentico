import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send,
  Bot,
  User,
  ChevronDown,
  Workflow as WorkflowIcon,
  Plus,
  Terminal,
  Code,
  Zap,
  History,
  Trash2,
  Cpu,
  Search,
  FileCode,
  CheckCircle2,
  Loader2,
  ChevronRight,
  Hash,
  Command,
  Settings2,
  X,
  Users,
  Play
} from 'lucide-react';
import { Agent, Workflow, Message } from '../types';
import { GoogleGenAI } from '@google/genai';

interface ToolCall {
  id: string;
  type: 'bash' | 'read' | 'write' | 'grep' | 'search_docs';
  input: string;
  output?: string;
  status: 'running' | 'success' | 'error';
}

interface ExtendedMessage extends Message {
  toolCalls?: ToolCall[];
}

interface ChatProps {
  agent: Agent;
  agents: Agent[];
  workflows: Workflow[];
  mode?: 'agent' | 'sprint';
  onAgentChange: (agent: Agent) => void;
  onNewWorkflow: () => void;
}

export default function Chat({ agent, agents, workflows, mode = 'agent', onAgentChange, onNewWorkflow }: ChatProps) {
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [showWorkflowPanel, setShowWorkflowPanel] = useState(true);
  const [currentMode, setCurrentMode] = useState<'agent' | 'sprint'>(mode);
  const [isSprintActive, setIsSprintActive] = useState(false);
  const [sprintLogs, setSprintLogs] = useState<{ agent: string; action: string; color: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentMode(mode);
  }, [mode]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sprintLogs]);

  const startSprint = async () => {
    if (!input.trim() || isSprintActive) return;
    setIsSprintActive(true);
    setSprintLogs([]);

    const task = input;
    setInput('');

    // Simulate agents working in sprint
    for (const a of agents) {
      const actions = [
        `Analyzing requirements for: ${task.substring(0, 20)}...`,
        `Drafting implementation plan...`,
        `Executing specialized task: ${a.skills[0] || 'Logic Processing'}`,
        `Reviewing results and optimizing...`,
        `Finalizing contribution to the sprint.`
      ];

      for (const action of actions) {
        setSprintLogs(prev => [...prev, { agent: a.name, action, color: a.color }]);
        await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));
      }
    }

    setIsSprintActive(false);
    setMessages(prev => [...prev, {
      role: 'model',
      content: `Sprint completed successfully. The team has processed the task: "${task}". All agents have contributed based on their specialized skills.`
    }]);
  };

  const simulateToolCall = async (type: ToolCall['type'], input: string): Promise<string> => {
    await new Promise(r => setTimeout(r, 1500));
    switch (type) {
      case 'bash': return `Executed: ${input}\nOutput: Success (0)`;
      case 'search_docs': return `Found 3 results for "${input}" in documentation.\n1. Next.js Middleware Guide\n2. Edge Runtime API\n3. Middleware Examples`;
      case 'read': return `Reading file: ${input}...\nContent loaded (142 lines).`;
      default: return 'Operation completed.';
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !agent) return;

    const userMessage: ExtendedMessage = { role: 'user', content: input };
    setMessages((prev: ExtendedMessage[]) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      setMessages(prev => [...prev, { role: 'model', content: '' }]); // Add a placeholder for the assistant's reply

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content
          })),
          system: agent?.soul || 'You are Claude, a highly capable AI assistant. Responda sempre em português do Brasil.'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro na resposta do servidor');
      }

      const data = await response.json();
      const assistantReply = data.content?.[0]?.text || 'Não consegui gerar uma resposta.';

      setMessages((prev: ExtendedMessage[]) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = { ...newMessages[newMessages.length - 1], content: assistantReply };
        return newMessages;
      });

    } catch (error: any) {
      console.error('Chat error:', error);
      setMessages((prev: ExtendedMessage[]) => [
        ...prev.slice(0, -1), // Remove the empty assistant message placeholder
        {
          role: 'model',
          content: `❌ Erro: ${error.message}`
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const ToolIcon = ({ type }: { type: ToolCall['type'] }) => {
    switch (type) {
      case 'bash': return <Terminal className="w-3.5 h-3.5" />;
      case 'search_docs': return <Search className="w-3.5 h-3.5" />;
      case 'read': return <FileCode className="w-3.5 h-3.5" />;
      default: return <Code className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="h-full flex bg-[#0a0a0a] text-zinc-300 font-sans">
      {/* Thread/Workflow Sidebar - Claude Code Style */}
      <AnimatePresence>
        {showWorkflowPanel && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-r border-white/5 flex flex-col bg-[#0d0d0d] overflow-hidden"
          >
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                <span className="text-xs font-mono uppercase tracking-widest font-bold text-zinc-400">Project Context</span>
              </div>
              <button className="p-1 hover:bg-white/5 rounded transition-colors">
                <Command className="w-3.5 h-3.5 text-zinc-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
              <div className="px-4 mb-6">
                <h3 className="text-[10px] font-mono uppercase tracking-widest text-zinc-600 mb-3">Active Workflows</h3>
                <div className="space-y-1">
                  {workflows.map(wf => (
                    <button key={wf.id} className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 flex items-center gap-3 group transition-all">
                      <Hash className="w-3.5 h-3.5 text-zinc-600 group-hover:text-blue-400" />
                      <span className="text-sm text-zinc-400 group-hover:text-zinc-200 truncate">{wf.name}</span>
                    </button>
                  ))}
                  <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 flex items-center gap-3 group text-zinc-600 hover:text-zinc-400 transition-all">
                    <Plus className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">New Workflow</span>
                  </button>
                </div>
              </div>

              <div className="px-4">
                <h3 className="text-[10px] font-mono uppercase tracking-widest text-zinc-600 mb-3">Recent History</h3>
                <div className="space-y-1">
                  <div className="px-3 py-2 text-xs text-zinc-500 italic">No recent threads</div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-white/5 bg-black/20">
              <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/5">
                {agent?.image ? (
                  <img src={agent.image} className="w-8 h-8 rounded object-cover" alt={agent.name} referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-8 h-8 rounded bg-blue-600/20 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-blue-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-zinc-200 truncate">{agent?.name || 'System'}</div>
                  <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-tighter">v1.2.4-stable</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[#0a0a0a]">
        {/* Header */}
        <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-[#0d0d0d]/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowWorkflowPanel(!showWorkflowPanel)}
              className="p-1.5 hover:bg-white/5 rounded transition-colors text-zinc-500 hover:text-zinc-200"
            >
              <WorkflowIcon className="w-4 h-4" />
            </button>
            <div className="h-4 w-px bg-white/10 mx-1" />
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-500">~/workspace/</span>
              <span className="text-xs font-mono text-zinc-200 font-bold">soul-node-ai</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-mono text-emerald-500 font-bold uppercase tracking-widest">Connected</span>
            </div>
            <button className="p-1.5 hover:bg-white/5 rounded transition-colors text-zinc-500 hover:text-zinc-200">
              <Settings2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages Container */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto scroll-smooth"
        >
          <div className="max-w-4xl mx-auto py-10 px-6 space-y-10">
            {messages.length === 0 && (
              <div className="py-20 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/20">
                  <Command className="w-8 h-8 text-blue-500" />
                </div>
                <h1 className="text-2xl font-display font-bold text-white mb-2">Claude Code Interface</h1>
                <p className="text-zinc-500 text-sm max-w-sm">
                  A high-performance agent interface for technical workflows.
                  Type <code className="bg-white/5 px-1 rounded text-blue-400">/help</code> to see available commands.
                </p>
              </div>
            )}

            {currentMode === 'sprint' && sprintLogs.map((log, i) => (
              <div key={`log-${i}`} className="flex items-center gap-3 font-mono text-[11px] animate-in fade-in slide-in-from-left-2 duration-300">
                <span className="text-zinc-600">[{new Date().toLocaleTimeString()}]</span>
                <span className="font-bold" style={{ color: log.color }}>{log.agent}:</span>
                <span className="text-zinc-400">{log.action}</span>
              </div>
            ))}

            {messages.map((msg, i) => (
              <div key={i} className="group animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-start gap-4 mb-2">
                  <div className={`w-6 h-6 rounded flex items-center justify-center mt-0.5 overflow-hidden ${msg.role === 'user' ? 'bg-zinc-800' : 'bg-blue-600/20'
                    }`}>
                    {msg.role === 'user' ? (
                      <User className="w-3.5 h-3.5 text-zinc-400" />
                    ) : (
                      agent?.image ? (
                        <img src={agent.image} className="w-full h-full object-cover" alt={agent.name} referrerPolicy="no-referrer" />
                      ) : (
                        <Bot className="w-3.5 h-3.5 text-blue-400" />
                      )
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-zinc-200">{msg.role === 'user' ? 'You' : (agent?.name || 'AI')}</span>
                      <span className="text-[10px] font-mono text-zinc-600">17:03:12</span>
                    </div>

                    {/* Tool Calls Rendering */}
                    {msg.toolCalls && msg.toolCalls.map(tc => (
                      <div key={tc.id} className="mb-4 rounded-lg border border-white/5 bg-black/40 overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2 bg-white/5 border-b border-white/5">
                          <div className="flex items-center gap-2">
                            <ToolIcon type={tc.type} />
                            <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-zinc-400">{tc.type}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {tc.status === 'running' ? (
                              <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            )}
                            <span className={`text-[10px] font-mono uppercase tracking-widest ${tc.status === 'running' ? 'text-blue-400' : 'text-emerald-500'
                              }`}>{tc.status}</span>
                          </div>
                        </div>
                        <div className="p-3 font-mono text-xs">
                          <div className="flex items-center gap-2 text-zinc-500 mb-2">
                            <ChevronRight className="w-3 h-3" />
                            <span className="text-zinc-300">{tc.input}</span>
                          </div>
                          {tc.output && (
                            <pre className="text-zinc-500 whitespace-pre-wrap pl-5 border-l border-white/10 mt-2">
                              {tc.output}
                            </pre>
                          )}
                        </div>
                      </div>
                    ))}

                    {msg.content && (
                      <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && !messages[messages.length - 1]?.toolCalls && (
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 rounded bg-blue-600/20 flex items-center justify-center mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div className="flex items-center gap-1.5 py-2">
                  <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Area - Claude Code Style */}
        <div className="p-6 border-t border-white/5 bg-[#0d0d0d]/50 backdrop-blur-md">
          <div className="max-w-4xl mx-auto">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition duration-500" />
              <div className="relative bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden focus-within:border-blue-500/50 transition-all shadow-2xl">
                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border-b border-white/5">
                  <div className="flex items-center gap-1.5">
                    {currentMode === 'agent' ? (
                      <>
                        {agent?.image ? (
                          <img src={agent.image} className="w-3 h-3 rounded-full object-cover" alt={agent.name} referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                        )}
                        <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest font-bold">{agent?.name || 'Agent'}</span>
                      </>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3 h-3 text-blue-400" />
                        <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest font-bold">Company Sprint</span>
                      </div>
                    )}
                  </div>
                  <div className="h-3 w-px bg-white/10 mx-1" />
                  <div className="flex items-center gap-1 bg-black/40 rounded-md p-0.5 border border-white/5">
                    <button
                      onClick={() => setCurrentMode('agent')}
                      className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase transition-all ${currentMode === 'agent' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      Agent
                    </button>
                    <button
                      onClick={() => setCurrentMode('sprint')}
                      className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase transition-all ${currentMode === 'sprint' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      Sprint
                    </button>
                  </div>
                  {currentMode === 'agent' && (
                    <>
                      <div className="h-3 w-px bg-white/10 mx-1" />
                      <button
                        onClick={() => setShowModelSelector(!showModelSelector)}
                        className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500 hover:text-zinc-200 transition-colors"
                      >
                        <span>{agent?.model || 'Select Model'}</span>
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>

                <div className="flex items-end gap-2 p-2">
                  <textarea
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (currentMode === 'agent') handleSend();
                        else startSprint();
                      }
                    }}
                    placeholder={currentMode === 'agent' ? `Ask ${agent?.name || 'AI'} to run a command...` : "Define the sprint goal for the team..."}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-3 px-3 resize-none max-h-48 min-h-[48px] placeholder:text-zinc-600"
                  />
                  <div className="flex items-center gap-2 pb-2 pr-2">
                    <button className="p-2 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-zinc-200 transition-colors">
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={currentMode === 'agent' ? handleSend : startSprint}
                      disabled={!input.trim() || isLoading || isSprintActive}
                      className={`h-9 px-4 rounded-lg flex items-center justify-center gap-2 transition-all font-bold text-xs uppercase tracking-widest ${input.trim() && !isLoading && !isSprintActive
                        ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]'
                        : 'bg-white/5 text-zinc-600'
                        }`}
                    >
                      {currentMode === 'agent' ? (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          Run
                        </>
                      ) : (
                        <>
                          <Play className={`w-3.5 h-3.5 ${isSprintActive ? 'animate-pulse' : ''}`} />
                          {isSprintActive ? 'In Sprint' : 'Sprint'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between px-2">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                  <span className="w-1 h-1 rounded-full bg-zinc-600" />
                  Context: 128k
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                  <span className="w-1 h-1 rounded-full bg-zinc-600" />
                  Latency: 142ms
                </div>
              </div>
              <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                Press <kbd className="bg-white/5 px-1 rounded border border-white/10">Enter</kbd> to execute
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Model Selector Popup */}
      <AnimatePresence>
        {showModelSelector && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowModelSelector(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#0d0d0d] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-4 border-b border-white/5 bg-black/20 flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-widest font-bold text-zinc-400">Select Active Soul</span>
                <button onClick={() => setShowModelSelector(false)} className="p-1 hover:bg-white/5 rounded">
                  <X className="w-4 h-4 text-zinc-500" />
                </button>
              </div>
              <div className="p-2">
                {agents.map(a => (
                  <button
                    key={a.id}
                    onClick={() => {
                      onAgentChange(a);
                      setShowModelSelector(false);
                    }}
                    className={`w-full text-left p-3 rounded-xl flex items-center justify-between group transition-all ${a.id === agent?.id ? 'bg-blue-600/10 border border-blue-500/20' : 'hover:bg-white/5 border border-transparent'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors overflow-hidden">
                        {a.image ? (
                          <img src={a.image} className="w-full h-full object-cover" alt={a.name} referrerPolicy="no-referrer" />
                        ) : (
                          <Bot className="w-4 h-4" style={{ color: a.color }} />
                        )}
                      </div>
                      <div>
                        <div className={`text-sm font-bold ${a.id === agent?.id ? 'text-blue-400' : 'text-zinc-300'}`}>{a.name}</div>
                        <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-tighter">{a.model}</div>
                      </div>
                    </div>
                    {a.id === agent?.id && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
