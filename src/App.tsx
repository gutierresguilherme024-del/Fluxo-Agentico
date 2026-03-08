import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Settings2,
  MessageSquare,
  Sparkles,
  X,
  Save,
  ChevronRight,
  Bot,
  Upload,
  ArrowLeft,
  Building2,
  Users,
  GitBranch,
  Trash2,
  Hash,
  Database,
  Cloud,
  Play,
  Mic,
  Zap
} from 'lucide-react';
import { Agent, Workflow, Company } from './types';
import Chat from './components/Chat';
import VoiceAgent from './components/VoiceAgent';
import { supabase } from './lib/supabase';

export default function App() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [view, setView] = useState<'home' | 'company' | 'chat' | 'channel'>('home');
  const [voiceAgent, setVoiceAgent] = useState<Agent | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const companyFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCompanies();
    fetchAgents();
    fetchWorkflows();
  }, []);

  const fetchCompanies = async () => {
    const { data, error } = await supabase.from('companies').select('*');
    if (error) {
      console.error('Error fetching companies:', error);
      return;
    }
    setCompanies(data);
  };

  const fetchAgents = async () => {
    const { data, error } = await supabase.from('agents').select('*');
    if (error) {
      console.error('Error fetching agents:', error);
      return;
    }
    setAgents(data.map((agent: any) => ({
      ...agent,
      companyId: agent.company_id,
      skills: Array.isArray(agent.skills) ? agent.skills : (agent.skills ? JSON.parse(agent.skills) : [])
    })));
  };

  const fetchWorkflows = async () => {
    const { data, error } = await supabase.from('workflows').select('*');
    if (error) {
      console.error('Error fetching workflows:', error);
      return;
    }
    setWorkflows(data.map((wf: any) => ({
      ...wf,
      steps: Array.isArray(wf.steps) ? wf.steps : (wf.steps ? JSON.parse(wf.steps) : [])
    })));
  };

  const saveCompany = async (company: Company) => {
    const { error } = await supabase.from('companies').upsert({
      id: company.id,
      name: company.name,
      description: company.description,
      image: company.image
    });

    if (error) {
      console.error('Error saving company:', error);
      alert('Error saving company: ' + error.message);
      return;
    }

    fetchCompanies();
    setEditingCompany(null);
  };

  const deleteCompany = async (id: string) => {
    if (!confirm('Are you sure? This will delete all agents in this company.')) return;
    const { error } = await supabase.from('companies').delete().eq('id', id);
    if (error) {
      console.error('Error deleting company:', error);
      return;
    }
    fetchCompanies();
    fetchAgents();
  };

  const saveAgent = async (agent: Agent) => {
    const { error } = await supabase.from('agents').upsert({
      id: agent.id,
      company_id: agent.companyId,
      name: agent.name,
      soul: agent.soul,
      model: agent.model,
      color: agent.color,
      image: agent.image,
      skills: agent.skills
    });

    if (error) {
      console.error('Error saving agent:', error);
      alert('Error saving agent: ' + error.message);
      return;
    }

    fetchAgents();
    setEditingAgent(null);
  };

  const startChat = (agent: Agent) => {
    setSelectedAgent(agent);
    setView('chat');
  };

  const enterCompany = (company: Company) => {
    setSelectedCompany(company);
    setView('company');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'agent' | 'company') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'agent' && editingAgent) {
          setEditingAgent({ ...editingAgent, image: reader.result as string });
        } else if (type === 'company' && editingCompany) {
          setEditingCompany({ ...editingCompany, image: reader.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const companyAgents = agents.filter(a => a.companyId === selectedCompany?.id);

  return (
    <div className="min-h-screen flex flex-col bg-[#050505] text-zinc-100 selection:bg-blue-500/30">
      {/* Navigation */}
      <nav className="h-16 border-b border-white/5 flex items-center justify-between px-6 glass sticky top-0 z-50">
        <div className="flex items-center gap-4">
          {view !== 'home' && (
            <button
              onClick={() => {
                if (view === 'chat' || view === 'channel') setView('company');
                else setView('home');
              }}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors text-zinc-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('home')}>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight">
              {view === 'home' ? 'SoulForge' : selectedCompany?.name}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {view === 'company' && (
            <button
              onClick={() => {
                if (!selectedAgent && companyAgents.length > 0) {
                  setSelectedAgent(companyAgents[0]);
                }
                setView('channel');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/20 transition-all font-medium text-sm"
            >
              <Hash className="w-4 h-4" />
              Company Channel
            </button>
          )}
          <div className="h-6 w-px bg-white/10 mx-2" />
          <div className="flex -space-x-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-[#050505] bg-zinc-800 overflow-hidden">
                <img src={`https://i.pravatar.cc/100?u=${i}`} alt="User" referrerPolicy="no-referrer" />
              </div>
            ))}
          </div>
        </div>
      </nav>

      <main className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {view === 'home' ? (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-8 max-w-7xl mx-auto w-full space-y-12"
            >
              <div className="flex items-end justify-between">
                <div>
                  <h1 className="text-5xl font-display font-bold tracking-tight mb-4">Your AI Ecosystem</h1>
                  <p className="text-zinc-400 text-lg">Manage your companies and their specialized AI workforces.</p>
                </div>
                <div className="flex gap-4 items-center">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setVoiceAgent({ id: 'jarvis', companyId: 'system', name: 'Jarvis', soul: 'Você é o Jarvis, o sistema de inteligência artificial central. Seja extremamente inteligente, use um tom sofisticado e britânico, e ajude o Guilherme em tudo o que ele precisar usando as ferramentas disponíveis.', model: 'claude-3-5-sonnet', color: '#00f2ff', skills: ['Neural Core', 'Voice Sync', 'Contextual Memory'] })}
                    className="relative group px-8 py-4 bg-black rounded-2xl border border-cyan-500/50 text-cyan-400 font-black tracking-[0.2em] shadow-[0_0_20px_rgba(6,182,212,0.2)] hover:shadow-[0_0_40px_rgba(6,182,212,0.4)] transition-all overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center gap-3 relative z-10">
                      <Zap className="w-5 h-5 animate-pulse text-cyan-400" />
                      <span>ACCESS JARVIS</span>
                    </div>
                  </motion.button>

                  <button
                    onClick={() => setEditingCompany({ id: Date.now().toString(), name: '', description: '', image: '' })}
                    className="bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white px-6 py-4 rounded-2xl font-medium flex items-center gap-2 transition-all border border-white/5"
                  >
                    <Plus className="w-5 h-5" />
                    New Company
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {companies.map(company => (
                  <div key={company.id} className="group relative glass rounded-3xl overflow-hidden border border-white/5 hover:border-blue-500/30 transition-all">
                    <div className="aspect-video w-full bg-zinc-900 overflow-hidden relative">
                      {company.image ? (
                        <img src={company.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={company.name} referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-700">
                          <Building2 className="w-16 h-16" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4">
                        <h3 className="text-2xl font-bold text-white">{company.name}</h3>
                      </div>
                    </div>
                    <div className="p-6 space-y-4">
                      <p className="text-zinc-400 text-sm line-clamp-2">{company.description}</p>

                      <div className="flex items-center gap-4 pt-4 border-t border-white/5">
                        <div className="flex items-center gap-1.5 text-zinc-500">
                          <Users className="w-4 h-4" />
                          <span className="text-xs font-mono">{agents.filter(a => a.companyId === company.id).length} Agents</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-zinc-500">
                          <GitBranch className="w-4 h-4" />
                          <span className="text-xs font-mono">12 Workflows</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => enterCompany(company)}
                          className="flex-1 bg-white/5 hover:bg-white/10 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
                        >
                          Manage
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingCompany(company)}
                          className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-zinc-400"
                        >
                          <Settings2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => deleteCompany(company.id)}
                          className="p-2.5 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-all text-red-400"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : view === 'company' ? (
            <motion.div
              key="company"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8 max-w-7xl mx-auto w-full space-y-8"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-blue-600/20 flex items-center justify-center border border-blue-500/20">
                    <Building2 className="w-8 h-8 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-display font-bold">{selectedCompany?.name}</h2>
                    <p className="text-zinc-400">Node-based AI Workforce Management</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all text-zinc-400 hover:text-white group relative">
                    <Database className="w-5 h-5" />
                    <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-zinc-800 text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Supabase</span>
                  </button>
                  <button className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all text-zinc-400 hover:text-white group relative">
                    <GitBranch className="w-5 h-5" />
                    <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-zinc-800 text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">GitHub</span>
                  </button>
                  <button className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all text-zinc-400 hover:text-white group relative">
                    <Cloud className="w-5 h-5" />
                    <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-zinc-800 text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Vercel</span>
                  </button>
                  <div className="w-px h-10 bg-white/10 mx-2" />
                  <button
                    onClick={() => setEditingAgent({ id: Date.now().toString(), companyId: selectedCompany!.id, name: 'New Agent', soul: '', model: 'gemini-3-flash-preview', color: '#3b82f6', skills: [] })}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20"
                  >
                    <Plus className="w-5 h-5" />
                    New Agent Node
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {companyAgents.map((agent) => (
                  <div key={agent.id} className="node-card p-6 flex flex-col gap-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {agent.image ? (
                          <img
                            src={agent.image}
                            alt={agent.name}
                            className="w-12 h-12 rounded-xl object-cover shadow-inner border border-white/10"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center shadow-inner"
                            style={{ backgroundColor: `${agent.color}20`, color: agent.color }}
                          >
                            <Bot className="w-7 h-7" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-display font-semibold text-lg">{agent.name}</h3>
                          <span className="text-xs font-mono opacity-50 uppercase tracking-widest">{agent.model}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setEditingAgent(agent)}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors text-zinc-400 hover:text-white"
                      >
                        <Settings2 className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {agent.skills?.map((skill, idx) => (
                        <span key={idx} className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/5 text-zinc-500 uppercase tracking-tighter">
                          {skill}
                        </span>
                      ))}
                    </div>

                    <p className="text-sm text-zinc-400 line-clamp-2 italic">
                      "{agent.soul || 'No soul defined yet...'}"
                    </p>

                    <div className="mt-auto pt-4 flex items-center gap-2">
                      <button
                        onClick={() => startChat(agent)}
                        className="flex-1 bg-white/5 hover:bg-white/10 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Chat
                      </button>
                      <button
                        onClick={() => setVoiceAgent(agent)}
                        className="p-2 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 text-blue-400 rounded-lg transition-all"
                        title="Modo Voz"
                      >
                        <Mic className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="chat-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              <Chat
                agent={selectedAgent!}
                agents={companyAgents}
                workflows={workflows}
                mode={view === 'channel' ? 'sprint' : 'agent'}
                onAgentChange={setSelectedAgent}
                onNewWorkflow={() => { }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Agent Editor Modal */}
      <AnimatePresence>
        {editingAgent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setEditingAgent(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl glass rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center">
                      <Bot className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-display font-bold">Agent Soul</h2>
                      <p className="text-sm text-zinc-400">Configure the personality and model.</p>
                    </div>
                  </div>
                  <button onClick={() => setEditingAgent(null)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-6">
                    <div className="relative group">
                      <div
                        className="w-24 h-24 rounded-2xl flex items-center justify-center border-2 border-dashed border-white/10 overflow-hidden bg-black/20 group-hover:border-blue-500/50 transition-all cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {editingAgent.image ? (
                          <img src={editingAgent.image} className="w-full h-full object-cover" alt="Preview" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-zinc-500 group-hover:text-blue-400 transition-colors">
                            <Upload className="w-6 h-6" />
                            <span className="text-[10px] font-mono uppercase">Upload</span>
                          </div>
                        )}
                      </div>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'agent')} />
                    </div>
                    <div className="flex-1 space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-mono uppercase tracking-widest text-zinc-500">Agent Name</label>
                        <input
                          type="text"
                          value={editingAgent.name}
                          onChange={(e) => setEditingAgent({ ...editingAgent, name: e.target.value })}
                          className="soul-input"
                          placeholder="e.g. Architect"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-mono uppercase tracking-widest text-zinc-500">Model Selection</label>
                        <select
                          value={editingAgent.model}
                          onChange={(e) => setEditingAgent({ ...editingAgent, model: e.target.value })}
                          className="soul-input"
                        >
                          <option value="gemini-3-flash-preview">Gemini 3 Flash (Fast)</option>
                          <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Advanced)</option>
                          <option value="gemini-3.1-flash-lite-preview">Gemini 3.1 Flash Lite</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-mono uppercase tracking-widest text-zinc-500">Agent Soul (System Prompt)</label>
                    <textarea
                      rows={4}
                      value={editingAgent.soul}
                      onChange={(e) => setEditingAgent({ ...editingAgent, soul: e.target.value })}
                      className="soul-input resize-none"
                      placeholder="Define the personality, constraints, and behavior..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-mono uppercase tracking-widest text-zinc-500">Skills (Comma separated)</label>
                    <input
                      type="text"
                      value={editingAgent.skills?.join(', ')}
                      onChange={(e) => setEditingAgent({ ...editingAgent, skills: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                      className="soul-input"
                      placeholder="e.g. Coding, Design, Strategy"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-mono uppercase tracking-widest text-zinc-500">Theme Color</label>
                    <div className="flex gap-2">
                      {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'].map(color => (
                        <button
                          key={color}
                          onClick={() => setEditingAgent({ ...editingAgent, color })}
                          className={`w-8 h-8 rounded-full transition-all ${editingAgent.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-black scale-110' : 'opacity-50 hover:opacity-100'}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-10 flex gap-4">
                  <button onClick={() => setEditingAgent(null)} className="flex-1 py-3 rounded-xl font-medium border border-white/10 hover:bg-white/5 transition-all">Cancel</button>
                  <button onClick={() => saveAgent(editingAgent)} className="flex-1 py-3 rounded-xl font-medium bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20">
                    <Save className="w-5 h-5" />
                    Save Soul
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Company Editor Modal */}
      <AnimatePresence>
        {editingCompany && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setEditingCompany(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl glass rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-display font-bold">Company Profile</h2>
                      <p className="text-sm text-zinc-400">Define your organization's identity.</p>
                    </div>
                  </div>
                  <button onClick={() => setEditingCompany(null)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-6">
                    <div className="relative group">
                      <div
                        className="w-24 h-24 rounded-2xl flex items-center justify-center border-2 border-dashed border-white/10 overflow-hidden bg-black/20 group-hover:border-blue-500/50 transition-all cursor-pointer"
                        onClick={() => companyFileInputRef.current?.click()}
                      >
                        {editingCompany.image ? (
                          <img src={editingCompany.image} className="w-full h-full object-cover" alt="Preview" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-zinc-500 group-hover:text-blue-400 transition-colors">
                            <Upload className="w-6 h-6" />
                            <span className="text-[10px] font-mono uppercase">Upload</span>
                          </div>
                        )}
                      </div>
                      <input type="file" ref={companyFileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'company')} />
                    </div>
                    <div className="flex-1 space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-mono uppercase tracking-widest text-zinc-500">Company Name</label>
                        <input
                          type="text"
                          value={editingCompany.name}
                          onChange={(e) => setEditingCompany({ ...editingCompany, name: e.target.value })}
                          className="soul-input"
                          placeholder="e.g. Acme Corp"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-mono uppercase tracking-widest text-zinc-500">Description</label>
                    <textarea
                      rows={3}
                      value={editingCompany.description}
                      onChange={(e) => setEditingCompany({ ...editingCompany, description: e.target.value })}
                      className="soul-input resize-none"
                      placeholder="What does this company do?"
                    />
                  </div>


                </div>

                <div className="mt-10 flex gap-4">
                  <button onClick={() => setEditingCompany(null)} className="flex-1 py-3 rounded-xl font-medium border border-white/10 hover:bg-white/5 transition-all">Cancel</button>
                  <button onClick={() => saveCompany(editingCompany)} className="flex-1 py-3 rounded-xl font-medium bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20">
                    <Save className="w-5 h-5" />
                    Save Company
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Agente de Voz */}
      <AnimatePresence>
        {voiceAgent && (
          <VoiceAgent
            agent={voiceAgent}
            userId="default"
            onClose={() => setVoiceAgent(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
