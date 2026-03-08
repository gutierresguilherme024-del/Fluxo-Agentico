export interface Company {
  id: string;
  name: string;
  description: string;
  image?: string;
  activeGateway?: string;
}

export interface Agent {
  id: string;
  companyId: string;
  name: string;
  soul: string;
  model: string;
  color: string;
  image?: string;
  skills: string[];
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: string; // JSON string
}

export interface Message {
  role: 'user' | 'model';
  content: string;
}
