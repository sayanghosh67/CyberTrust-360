import React, { useState, useEffect, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import {
  Network,
  Search,
  RefreshCw,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';

import { CyberGraphNode } from './CyberGraphNode';
import { GraphDetailPanel } from './GraphDetailPanel';
import { fetchThreatGraph } from '../services/intelligenceService';
import type {
  GraphResponse,
  GraphNodeData,
  GraphEdgeData,
} from '../types/intelligence';

interface ThreatRelationshipGraphProps {
  onInvestigateUrl?: (url: string) => void;
  initialSearch?: string | null;
}

const nodeTypes = {
  cyber: CyberGraphNode,
};

// Force-radial layout algorithm
function calculateLayout(
  graphNodes: GraphNodeData[],
  graphEdges: GraphEdgeData[]
): { nodes: Node[]; edges: Edge[] } {
  const nodeCount = graphNodes.length;
  if (nodeCount === 0) return { nodes: [], edges: [] };

  // Separate nodes by hierarchy
  const coreEntities = graphNodes.filter((n) =>
    ['domain', 'brand', 'indicator'].includes(n.type)
  );
  const reports = graphNodes.filter((n) =>
    ['scam_report', 'url_scan'].includes(n.type)
  );
  const peripheral = graphNodes.filter((n) =>
    ['url', 'tactic'].includes(n.type)
  );

  const rfNodes: Node[] = [];
  const centerX = 500;
  const centerY = 350;

  // 1. Core indicators (inner circle)
  const coreRadius = Math.max(140, coreEntities.length * 45);
  coreEntities.forEach((n, idx) => {
    const angle = (2 * Math.PI * idx) / Math.max(1, coreEntities.length);
    rfNodes.push({
      id: n.id,
      type: 'cyber',
      position: {
        x: centerX + coreRadius * Math.cos(angle) - 100,
        y: centerY + coreRadius * Math.sin(angle) - 40,
      },
      data: n as unknown as Record<string, unknown>,
    });
  });

  // 2. Investigation reports (middle circle)
  const reportRadius = coreRadius + 220;
  reports.forEach((n, idx) => {
    const angle = (2 * Math.PI * idx) / Math.max(1, reports.length) + 0.3;
    rfNodes.push({
      id: n.id,
      type: 'cyber',
      position: {
        x: centerX + reportRadius * Math.cos(angle) - 100,
        y: centerY + reportRadius * Math.sin(angle) - 40,
      },
      data: n as unknown as Record<string, unknown>,
    });
  });

  // 3. Peripheral URLs & Tactics (outer circle)
  const peripheralRadius = reportRadius + 200;
  peripheral.forEach((n, idx) => {
    const angle = (2 * Math.PI * idx) / Math.max(1, peripheral.length) + 0.6;
    rfNodes.push({
      id: n.id,
      type: 'cyber',
      position: {
        x: centerX + peripheralRadius * Math.cos(angle) - 100,
        y: centerY + peripheralRadius * Math.sin(angle) - 40,
      },
      data: n as unknown as Record<string, unknown>,
    });
  });

  // Convert Edges
  const rfEdges: Edge[] = graphEdges.map((e) => {
    const isVerified = e.category === 'VERIFIED_SHARED_INDICATOR';
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      animated: isVerified,
      interactionWidth: 20,
      style: {
        stroke: isVerified ? '#10b981' : '#f59e0b',
        strokeWidth: isVerified ? 2.5 : 1.5,
        strokeDasharray: isVerified ? undefined : '5 5',
        cursor: 'pointer',
      },
      data: e as unknown as Record<string, unknown>,
    };
  });

  return { nodes: rfNodes, edges: rfEdges };
}

export const ThreatRelationshipGraph: React.FC<ThreatRelationshipGraphProps> = ({
  onInvestigateUrl,
  initialSearch,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [search, setSearch] = useState<string>(initialSearch || '');
  const [includeDemo, setIncludeDemo] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [rawResponse, setRawResponse] = useState<GraphResponse | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNodeData | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdgeData | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const loadGraph = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchThreatGraph(filterType, search, 100, includeDemo);
      setRawResponse(data);
      const layout = calculateLayout(data.nodes, data.edges);
      setNodes(layout.nodes);
      setEdges(layout.edges);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load intelligence graph.');
    } finally {
      setLoading(false);
    }
  }, [filterType, search, includeDemo, setNodes, setEdges]);

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node.data as unknown as GraphNodeData);
    setSelectedEdge(null);
  }, []);

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge.data as unknown as GraphEdgeData);
    setSelectedNode(null);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

  return (
    <section id="relationship-graph" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800/40 text-xs font-mono uppercase tracking-wider mb-2">
            <Network className="w-3.5 h-3.5 text-cyan-400" />
            <span>PHASE 4 — RELATIONSHIP INTELLIGENCE</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Threat Relationship Graph
          </h2>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Multi-hop infrastructure and social engineering correlation. Map shared malicious domains,
            cross-cluster burner contact numbers, and deceptive playbooks.
          </p>
        </div>

        {/* Global Controls & Demo Toggle */}
        <div className="flex flex-wrap items-center gap-2.5">
          <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 cursor-pointer hover:border-slate-700 transition-colors">
            <input
              type="checkbox"
              checked={includeDemo}
              onChange={(e) => setIncludeDemo(e.target.checked)}
              className="accent-cyan-500 rounded cursor-pointer"
            />
            <span>Synthetic Demo Clusters</span>
          </label>

          <button
            onClick={loadGraph}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
            title="Refresh Graph"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 backdrop-blur-md mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search domain, brand, phone, or tactic..."
            className="w-full bg-slate-950/90 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-2.5 text-xs text-slate-500 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: 'All Entities' },
            { id: 'verified_only', label: 'Verified Indicators' },
            { id: 'high_risk', label: 'High Risk (>=70)' },
            { id: 'scam_only', label: 'Scam DNA' },
            { id: 'url_only', label: 'URL Scans' },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setFilterType(pill.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-colors ${
                filterType === pill.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                  : 'bg-slate-950/60 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Demo Dataset Banner if active */}
      {rawResponse?.is_demo_data && (
        <div className="mb-4 px-4 py-2.5 rounded-xl bg-cyan-950/40 border border-cyan-700/50 flex items-center justify-between text-xs text-cyan-300 font-mono">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              SYNTHETIC DEMONSTRATION DATASET ACTIVE — Illustrates cross-cluster correlation between SBI YONO phishing and utility extortion.
            </span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-cyan-900 border border-cyan-700">
            DEMO MODE
          </span>
        </div>
      )}

      {/* Graph Visualizer Canvas Area */}
      <div className="relative w-full h-[640px] rounded-3xl border border-slate-800 bg-slate-950/90 shadow-2xl overflow-hidden backdrop-blur-md">
        {loading && (
          <div className="absolute inset-0 bg-slate-950/80 z-20 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
            <span className="text-xs font-mono text-cyan-300">Correlating Threat Infrastructure...</span>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <AlertTriangle className="w-10 h-10 text-rose-400" />
            <p className="text-sm text-slate-300 max-w-md">{error}</p>
            <button
              onClick={loadGraph}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono text-cyan-300"
            >
              Retry Graph Load
            </button>
          </div>
        )}

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.2}
          maxZoom={2.5}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#1e293b" gap={24} size={1} />
          <Controls className="!bg-slate-900 !border-slate-800 !rounded-xl overflow-hidden" />
          <MiniMap
            nodeColor={(n) => {
              if (n.data?.type === 'domain') return '#06b6d4';
              if (n.data?.type === 'scam_report') return '#f43f5e';
              if (n.data?.type === 'url_scan') return '#10b981';
              return '#64748b';
            }}
            className="!bg-slate-950/80 !border-slate-800 !rounded-xl"
            maskColor="rgba(15, 23, 42, 0.7)"
          />
        </ReactFlow>

        {/* Legend Overlay */}
        <div className="absolute bottom-4 left-4 z-10 p-3 rounded-2xl bg-slate-900/90 border border-slate-800/90 backdrop-blur-md text-[11px] font-mono space-y-1.5 shadow-xl pointer-events-none">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">
            Graph Legend
          </span>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <span className="text-slate-300">Registered Domain / URL</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-slate-300">Scam Report / High Risk Target</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
            <span className="text-slate-300">Impersonated Brand</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
            <span className="text-slate-300">Deceptive Scam Tactic</span>
          </div>
          <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
            <span className="w-3 h-0.5 bg-emerald-400" />
            <span className="text-emerald-300">Verified Shared Indicator</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 border-t border-dashed border-amber-400" />
            <span className="text-amber-300">Possible (Inferred) Link</span>
          </div>
        </div>

        {/* Inspection Side Panel Overlay */}
        <div className="absolute top-4 right-4 z-10 max-h-[600px]">
          <GraphDetailPanel
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            connectedEdges={
              rawResponse?.edges.filter(
                (e) => e.source === selectedNode?.id || e.target === selectedNode?.id
              ) || []
            }
            onSelectEdge={(edge) => {
              setSelectedEdge(edge);
              setSelectedNode(null);
            }}
            onClose={() => {
              setSelectedNode(null);
              setSelectedEdge(null);
            }}
            onInvestigateUrl={onInvestigateUrl}
          />
        </div>
      </div>
    </section>
  );
};
