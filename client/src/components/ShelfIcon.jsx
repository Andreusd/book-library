import React from 'react';
import {
  Folder, FolderGit2, GitBranch, Binary, Code, Code2, Terminal, FileCode,
  Workflow, Cpu, HardDrive, Server, Database, Cloud, Network, Wifi,
  Globe, Boxes, Layers, Component, Package, Brain, Bot, Sparkles,
  Atom, TestTube, FlaskConical, Calculator, Sigma, BarChart3, LineChart,
  PieChart, TrendingUp, Regex, CheckCircle2, ShieldCheck, Bug, Wrench,
  Briefcase, Target, Compass, Award, Rocket, Zap, Lock, Key,
  Laptop, Monitor, Smartphone, BookOpen, Bookmark, Glasses, Languages,
  Lightbulb, Coffee, Heart, Star, Palette
} from 'lucide-react';

export const ICON_MAP = {
  Folder,
  FolderGit2,
  GitBranch,
  Binary,
  Code,
  Code2,
  Terminal,
  FileCode,
  Workflow,
  Cpu,
  HardDrive,
  Server,
  Database,
  Cloud,
  Network,
  Wifi,
  Globe,
  Boxes,
  Layers,
  Component,
  Package,
  Brain,
  Bot,
  Sparkles,
  Atom,
  TestTube,
  FlaskConical,
  Calculator,
  Sigma,
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  Regex,
  CheckCircle2,
  ShieldCheck,
  Bug,
  Wrench,
  Briefcase,
  Target,
  Compass,
  Award,
  Rocket,
  Zap,
  Lock,
  Key,
  Laptop,
  Monitor,
  Smartphone,
  BookOpen,
  Bookmark,
  Glasses,
  Languages,
  Lightbulb,
  Coffee,
  Heart,
  Star,
  Palette
};

export const AVAILABLE_SHELF_ICONS = [
  // Dev & Code
  { name: 'GitBranch', label: 'Git / Algoritmos', labelEn: 'Git / Algorithms', category: 'Dev', tags: ['git', 'algoritmo', 'branch', 'tree'] },
  { name: 'Binary', label: 'Binário / Compiladores', labelEn: 'Binary / Compilers', category: 'Dev', tags: ['binario', 'compilador', 'low-level', '01'] },
  { name: 'Code2', label: 'Linguagens / Código', labelEn: 'Languages / Code', category: 'Dev', tags: ['codigo', 'code', 'programacao', 'developer'] },
  { name: 'Code', label: 'Tags de Código', labelEn: 'Code Tags', category: 'Dev', tags: ['code', 'html', 'syntax'] },
  { name: 'Terminal', label: 'Terminal / CLI', labelEn: 'Terminal / CLI', category: 'Dev', tags: ['terminal', 'bash', 'console', 'cli', 'so', 'linux'] },
  { name: 'FileCode', label: 'Arquivo de Código', labelEn: 'Code File', category: 'Dev', tags: ['arquivo', 'script', 'source'] },
  { name: 'FolderGit2', label: 'Repositório Git', labelEn: 'Git Repository', category: 'Dev', tags: ['git', 'repo', 'pasta'] },
  { name: 'Workflow', label: 'Fluxo / Pipeline', labelEn: 'Workflow / Pipeline', category: 'Dev', tags: ['fluxo', 'ci', 'cd', 'processo'] },
  { name: 'Regex', label: 'Expressões Regulares', labelEn: 'Regular Expressions', category: 'Dev', tags: ['regex', 'padrao', 'regexp'] },
  { name: 'CheckCircle2', label: 'Testes / Validação', labelEn: 'Testing / QA', category: 'Dev', tags: ['teste', 'qa', 'check', 'aprovado'] },
  { name: 'Bug', label: 'Debug / Correções', labelEn: 'Bug / Debugging', category: 'Dev', tags: ['bug', 'debug', 'erro'] },
  { name: 'Wrench', label: 'Engenharia / Ferramentas', labelEn: 'Engineering / Tools', category: 'Dev', tags: ['engenharia', 'tools', 'ferramenta'] },

  // Architecture & Modules
  { name: 'Boxes', label: 'Arquitetura / Módulos', labelEn: 'Architecture / Boxes', category: 'Architecture', tags: ['arquitetura', 'modulos', 'caixas', 'design'] },
  { name: 'Layers', label: 'Camadas / Estrutura', labelEn: 'Layers / Structure', category: 'Architecture', tags: ['camadas', 'stack', 'layers'] },
  { name: 'Component', label: 'Componentes', labelEn: 'Components', category: 'Architecture', tags: ['componente', 'peca', 'bloco'] },
  { name: 'Package', label: 'Pacotes / Frameworks', labelEn: 'Packages / Frameworks', category: 'Architecture', tags: ['pacote', 'framework', 'npm', 'library'] },

  // Systems & Infrastructure
  { name: 'Cpu', label: 'Processador / Hardware', labelEn: 'CPU / Hardware', category: 'System', tags: ['cpu', 'processador', 'hardware', 'chip'] },
  { name: 'Server', label: 'Servidores / Backend', labelEn: 'Servers / Backend', category: 'System', tags: ['servidor', 'server', 'sistemas', 'infra'] },
  { name: 'Database', label: 'Banco de Dados', labelEn: 'Database', category: 'System', tags: ['banco', 'dados', 'sql', 'nosql', 'db'] },
  { name: 'Cloud', label: 'Computação em Nuvem', labelEn: 'Cloud Computing', category: 'System', tags: ['nuvem', 'cloud', 'aws', 'azure'] },
  { name: 'Network', label: 'Redes de Computadores', labelEn: 'Computer Networks', category: 'System', tags: ['rede', 'network', 'roteador', 'tcp'] },
  { name: 'Wifi', label: 'Conexão Sem Fio', labelEn: 'Wi-Fi / Wireless', category: 'System', tags: ['wifi', 'wireless', 'sem fio'] },
  { name: 'Globe', label: 'Web / Internet', labelEn: 'Web / Internet', category: 'System', tags: ['web', 'internet', 'globo', 'mundo'] },
  { name: 'HardDrive', label: 'Disco / Armazenamento', labelEn: 'Hard Drive / Storage', category: 'System', tags: ['disco', 'hd', 'ssd', 'storage'] },
  { name: 'ShieldCheck', label: 'Segurança / Proteção', labelEn: 'Security / Shield', category: 'System', tags: ['seguranca', 'shield', 'firewall'] },
  { name: 'Lock', label: 'Criptografia / Chave', labelEn: 'Cryptography / Lock', category: 'System', tags: ['lock', 'cadeado', 'cripto'] },

  // Science & Math & AI
  { name: 'Brain', label: 'Inteligência Artificial', labelEn: 'Artificial Intelligence', category: 'Science', tags: ['ia', 'ai', 'cerebro', 'ml', 'neural'] },
  { name: 'Bot', label: 'Robótica / Agentes', labelEn: 'Robotics / Bots', category: 'Science', tags: ['bot', 'robo', 'automacao'] },
  { name: 'Sparkles', label: 'Inovação / GenAI', labelEn: 'Innovation / GenAI', category: 'Science', tags: ['ia', 'sparkles', 'futuro'] },
  { name: 'Atom', label: 'Física / Ciências', labelEn: 'Physics / Science', category: 'Science', tags: ['fisica', 'atomo', 'ciencia', 'nuclear'] },
  { name: 'Calculator', label: 'Matemática / Cálculo', labelEn: 'Mathematics / Calculator', category: 'Math', tags: ['matematica', 'calculo', 'conta', 'numeros'] },
  { name: 'Sigma', label: 'Estatística / Somatório', labelEn: 'Statistics / Sum', category: 'Math', tags: ['estatistica', 'sigma', 'somatorio', 'media'] },
  { name: 'BarChart3', label: 'Gráficos de Barra', labelEn: 'Bar Charts / Metrics', category: 'Data', tags: ['grafico', 'estatistica', 'dados', 'analytics'] },
  { name: 'LineChart', label: 'Linhas de Tendência', labelEn: 'Line Charts', category: 'Data', tags: ['linha', 'metrica', 'evolucao'] },
  { name: 'PieChart', label: 'Gráficos de Pizza', labelEn: 'Pie Charts', category: 'Data', tags: ['pizza', 'proporcao'] },
  { name: 'TrendingUp', label: 'Crescimento / Finanças', labelEn: 'Trending / Growth', category: 'Data', tags: ['crescimento', 'alta', 'financas'] },
  { name: 'TestTube', label: 'Laboratório / Tubo de Ensaio', labelEn: 'Test Tube / Lab', category: 'Science', tags: ['lab', 'experimento', 'quimica'] },
  { name: 'FlaskConical', label: 'Química / Pesquisa', labelEn: 'Flask / Research', category: 'Science', tags: ['pesquisa', 'quimica', 'frasco'] },

  // General & Productivity
  { name: 'Folder', label: 'Pasta Padrão', labelEn: 'Default Folder', category: 'General', tags: ['pasta', 'diretorio', 'padrao'] },
  { name: 'Briefcase', label: 'Carreira / Negócios', labelEn: 'Career / Business', category: 'General', tags: ['carreira', 'negocios', 'trabalho', 'gestao'] },
  { name: 'Target', label: 'Metas / Foco', labelEn: 'Goals / Focus', category: 'General', tags: ['alvo', 'meta', 'foco'] },
  { name: 'Compass', label: 'Guia / Direção', labelEn: 'Compass / Guide', category: 'General', tags: ['bussola', 'guia', 'orientacao'] },
  { name: 'Award', label: 'Prêmio / Certificação', labelEn: 'Award / Certification', category: 'General', tags: ['premio', 'certificado', 'conquista'] },
  { name: 'Rocket', label: 'Lançamento / Performance', labelEn: 'Rocket / Startup', category: 'General', tags: ['foguete', 'velocidade', 'startup'] },
  { name: 'Zap', label: 'Energia / Produtividade', labelEn: 'Energy / Speed', category: 'General', tags: ['raio', 'energia', 'rapido'] },
  { name: 'Laptop', label: 'Computação / Notebook', labelEn: 'Laptop / Computer', category: 'General', tags: ['laptop', 'notebook', 'computacao', 'pc'] },
  { name: 'Monitor', label: 'Desktop / Monitor', labelEn: 'Desktop / Screen', category: 'General', tags: ['tela', 'monitor', 'desktop'] },
  { name: 'BookOpen', label: 'Livro Aberto', labelEn: 'Open Book', category: 'General', tags: ['livro', 'leitura', 'estudo'] },
  { name: 'Bookmark', label: 'Marcador de Página', labelEn: 'Bookmark', category: 'General', tags: ['marcador', 'favorito'] },
  { name: 'Glasses', label: 'Estudo / Leitura', labelEn: 'Study / Glasses', category: 'General', tags: ['oculos', 'leitura', 'pesquisa'] },
  { name: 'Languages', label: 'Idiomas / Tradução', labelEn: 'Languages / Translation', category: 'General', tags: ['idioma', 'lingua', 'ingles'] },
  { name: 'Lightbulb', label: 'Ideias / Conceitos', labelEn: 'Ideas / Concepts', category: 'General', tags: ['ideia', 'lampada', 'criatividade'] },
  { name: 'Coffee', label: 'Café / Produtividade', labelEn: 'Coffee / Break', category: 'General', tags: ['cafe', 'coffee', 'dev'] },
  { name: 'Palette', label: 'Design / Cores', labelEn: 'Design / Palette', category: 'General', tags: ['design', 'arte', 'paleta'] }
];

export const AVAILABLE_FOLDER_ICONS = AVAILABLE_SHELF_ICONS;

export default function ShelfIcon({ icon, className = 'w-4 h-4' }) {
  const IconComponent = ICON_MAP[icon] || Folder;
  return <IconComponent className={className} />;
}

export const FolderIcon = ShelfIcon;
