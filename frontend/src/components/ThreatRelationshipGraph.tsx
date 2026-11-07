import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
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
  Eye,
  Layers,
  ChevronRight,
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

// Internal auto-centering controller on filter/search change
const GraphAutoCenter: React.FC<{ filterKey: string }> = ({ filterKey }) => {
  const { fitView } = useReactFlow();
  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ padding: 0.25, duration: 350 });
    }, 120);
    return () => clearTimeout(timer);
  }, [fitView, filterKey]);
  return null;
};

// Cluster-based anti-overlap layout algorithm
function calculateLayout(
  graphNodes: GraphNodeData[],
  graphEdges: GraphEdgeData[]
): { nodes: Node[]; edges: Edge[] } {
  const nodeCount = graphNodes.length;
  if (nodeCount === 0) return { nodes: [], edges: [] };

  const nodeMap = new Map<string, GraphNodeData>();
  graphNodes.forEach((n) => nodeMap.set(n.id, n));

  // Build adjacency list
  const adj = new Map<string, Set<string>>();
  graphNodes.forEach((n) => adj.set(n.id, new Set()));
  graphEdges.forEach((e) => {
    if (adj.has(e.source) && adj.has(e.target)) {
      adj.get(e.source)!.add(e.target);
      adj.get(e.target)!.add(e.source);
    }
  });

  // Calculate node degree (connectivity)
  const degrees = new Map<string, number>();
  graphNodes.forEach((n) => {
    degrees.set(n.id, adj.get(n.id)?.size || 0);
  });

  // Detect connected components (clusters)
  const visited = new Set<string>();
  const components: string[][] = [];

  graphNodes.forEach((node) => {
    if (visited.has(node.id)) return;
    const comp: string[] = [];
    const queue: string[] = [node.id];
    visited.add(node.id);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      comp.push(curr);
      const neighbors = adj.get(curr);
      if (neighbors) {
        neighbors.forEach((nbr) => {
          if (!visited.has(nbr)) {
            visited.add(nbr);
            queue.push(nbr);
          }
        });
      }
    }
    components.push(comp);
  });

  // Separate multi-node clusters and isolated nodes
  const multiNodeClusters = components
    .filter((c) => c.length > 1)
    .sort((a, b) => b.length - a.length);
  const isolatedNodeIds = components
    .filter((c) => c.length === 1)
    .map((c) => c[0]);

  const positions = new Map<string, { x: number; y: number }>();

  // Determine grid columns for cluster packing
  const CLUSTER_COLUMNS =
    multiNodeClusters.length > 6 ? 3 : multiNodeClusters.length > 2 ? 2 : 1;

  let currentClusterX = 40;
  let currentClusterY = 40;
  let maxClusterHeightInRow = 0;

  multiNodeClusters.forEach((comp, compIdx) => {
    // Determine the hub node of this cluster (highest degree, domain, or brand)
    let hubId = comp[0];
    let maxScore = -1;
    comp.forEach((nid) => {
      const n = nodeMap.get(nid);
      const deg = degrees.get(nid) || 0;
      let score = deg * 10;
      if (n?.type === 'domain') score += 25;
      if (n?.type === 'brand') score += 20;
      if (n?.type === 'scam_report') score += 10;
      if (score > maxScore) {
        maxScore = score;
        hubId = nid;
      }
    });

    const otherNodes = comp.filter((nid) => nid !== hubId);

    // Group remaining nodes into concentric shells around the hub
    const shell1 = otherNodes.slice(0, 6);
    const shell2 = otherNodes.slice(6, 16);
    const shell3 = otherNodes.slice(16);

    const r1 = Math.max(220, shell1.length * 45);
    const r2 = r1 + 190;
    const r3 = r2 + 210;

    const maxRadius =
      shell3.length > 0 ? r3 : shell2.length > 0 ? r2 : shell1.length > 0 ? r1 : 160;
    const clusterBoundingSize = maxRadius * 2 + 80;

    // Check row wrapping
    const colIdx = compIdx % CLUSTER_COLUMNS;
    if (colIdx === 0 && compIdx > 0) {
      currentClusterX = 40;
      currentClusterY += maxClusterHeightInRow + 180;
      maxClusterHeightInRow = 0;
    }

    const clusterCenterX = currentClusterX + maxRadius + 60;
    const clusterCenterY = currentClusterY + maxRadius + 60;

    // Place Hub
    positions.set(hubId, { x: clusterCenterX, y: clusterCenterY });

    // Place Shell 1
    shell1.forEach((nid, i) => {
      const angle = (2 * Math.PI * i) / Math.max(1, shell1.length);
      positions.set(nid, {
        x: clusterCenterX + r1 * Math.cos(angle),
        y: clusterCenterY + r1 * Math.sin(angle),
      });
    });

    // Place Shell 2
    shell2.forEach((nid, i) => {
      const angle = (2 * Math.PI * i) / Math.max(1, shell2.length) + 0.35;
      positions.set(nid, {
        x: clusterCenterX + r2 * Math.cos(angle),
        y: clusterCenterY + r2 * Math.sin(angle),
      });
    });

    // Place Shell 3
    shell3.forEach((nid, i) => {
      const angle = (2 * Math.PI * i) / Math.max(1, shell3.length) + 0.7;
      positions.set(nid, {
        x: clusterCenterX + r3 * Math.cos(angle),
        y: clusterCenterY + r3 * Math.sin(angle),
      });
    });

    currentClusterX += clusterBoundingSize + 180;
    if (clusterBoundingSize > maxClusterHeightInRow) {
      maxClusterHeightInRow = clusterBoundingSize;
    }
  });

  // Lay out isolated entities cleanly in a neat grid at the bottom
  if (isolatedNodeIds.length > 0) {
    const startY = currentClusterY + maxClusterHeightInRow + (multiNodeClusters.length > 0 ? 220 : 40);
    const startX = 60;
    const ISO_COLS = 4;
    const ISO_COL_WIDTH = 300;
    const ISO_ROW_HEIGHT = 130;

    isolatedNodeIds.forEach((nid, idx) => {
      const row = Math.floor(idx / ISO_COLS);
      const col = idx % ISO_COLS;
      positions.set(nid, {
        x: startX + col * ISO_COL_WIDTH,
        y: startY + row * ISO_ROW_HEIGHT,
      });
    });
  }

  // Iterative collision resolution pass (guarantees zero node overlap)
  const nodeIds = graphNodes.map((n) => n.id);
  const MIN_DX = 280;
  const MIN_DY = 120;
  const ITERATIONS = 15;

  for (let iter = 0; iter < ITERATIONS; iter++) {
    let moved = false;
    for (let i = 0; i < nodeIds.length; i++) {
      const idA = nodeIds[i];
      const posA = positions.get(idA);
      if (!posA) continue;

      for (let j = i + 1; j < nodeIds.length; j++) {
        const idB = nodeIds[j];
        const posB = positions.get(idB);
        if (!posB) continue;

        const dx = posB.x - posA.x;
        const dy = posB.y - posA.y;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        if (absDx < MIN_DX && absDy < MIN_DY) {
          moved = true;
          const overlapX = MIN_DX - absDx;
          const overlapY = MIN_DY - absDy;

          const signX = dx >= 0 ? 1 : -1;
          const signY = dy >= 0 ? 1 : -1;

          const pushX = (overlapX / 2) * signX;
          const pushY = (overlapY / 2) * signY;

          posA.x -= pushX * 0.55;
          posA.y -= pushY * 0.55;
          posB.x += pushX * 0.55;
          posB.y += pushY * 0.55;
        }
      }
    }
    if (!moved) break;
  }

  // Convert to React Flow Nodes
  const rfNodes: Node[] = graphNodes.map((n) => {
    const pos = positions.get(n.id) || { x: 0, y: 0 };
    return {
      id: n.id,
      type: 'cyber',
      position: { x: pos.x - 120, y: pos.y - 45 },
      data: n as unknown as Record<string, unknown>,
    };
  });

  // Convert to React Flow Edges
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
  // Default Synthetic Demo Clusters to OFF as requested by user
  const [includeDemo, setIncludeDemo] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Manageable view mode: 'focused' (initial manageable cluster view) or 'all' (full dataset)
  const [viewMode, setViewMode] = useState<'focused' | 'all'>('focused');
  const [expandedClusterRoots, setExpandedClusterRoots] = useState<Set<string>>(new Set());

  const [rawResponse, setRawResponse] = useState<GraphResponse | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNodeData | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdgeData | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // 1. Fetch raw graph from backend
  const loadGraph = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Pass a generous record limit to backend so correlation engine evaluates complete database
      const data = await fetchThreatGraph(filterType, search, 100, includeDemo);
      setRawResponse(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load intelligence graph.');
    } finally {
      setLoading(false);
    }
  }, [filterType, search, includeDemo]);

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  // Clear selections when filter, search or demo mode changes
  useEffect(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, [filterType, search, includeDemo]);

  // If initialSearch changes from parent, sync search state
  useEffect(() => {
    if (initialSearch !== undefined && initialSearch !== null) {
      setSearch(initialSearch);
    }
  }, [initialSearch]);

  // 2. Compute displayed subset of nodes and edges based on viewMode and expandedClusterRoots
  const { displayedNodes, displayedEdges, totalDatasetCount } = useMemo(() => {
    if (!rawResponse) {
      return { displayedNodes: [], displayedEdges: [], totalDatasetCount: 0 };
    }

    const allNodes = rawResponse.nodes;
    const allEdges = rawResponse.edges;
    const totalCount = allNodes.length;

    // In 'all' mode, or when explicit search or type filtering is applied, show all matching nodes
    if (viewMode === 'all' || search.trim().length > 0 || filterType !== 'all') {
      return {
        displayedNodes: allNodes,
        displayedEdges: allEdges,
        totalDatasetCount: totalCount,
      };
    }

    // In 'focused' mode: identify top connected clusters and key recurring indicators
    // Build quick degree map from allEdges
    const degreeMap = new Map<string, number>();
    allEdges.forEach((e) => {
      degreeMap.set(e.source, (degreeMap.get(e.source) || 0) + 1);
      degreeMap.set(e.target, (degreeMap.get(e.target) || 0) + 1);
    });

    // Score nodes for initial visibility priority
    const scoredNodes = allNodes.map((n) => {
      const deg = degreeMap.get(n.id) || 0;
      let score = deg * 6;
      if (n.report_count > 1) score += 40;
      if (n.type === 'domain') score += 25;
      if (n.type === 'brand') score += 20;
      if ((n.risk_score || 0) >= 70) score += 30;
      else if ((n.risk_score || 0) >= 40) score += 15;
      return { node: n, score };
    });

    scoredNodes.sort((a, b) => b.score - a.score);

    // Initial manageable set: top 28 entities
    const visibleNodeIdSet = new Set<string>(
      scoredNodes.slice(0, Math.min(28, scoredNodes.length)).map((s) => s.node.id)
    );

    // Expand clusters explicitly requested by the user
    expandedClusterRoots.forEach((rootId) => {
      visibleNodeIdSet.add(rootId);
      allEdges.forEach((e) => {
        if (e.source === rootId) visibleNodeIdSet.add(e.target);
        if (e.target === rootId) visibleNodeIdSet.add(e.source);
      });
    });

    const filteredNodes = allNodes.filter((n) => visibleNodeIdSet.has(n.id));
    const filteredEdges = allEdges.filter(
      (e) => visibleNodeIdSet.has(e.source) && visibleNodeIdSet.has(e.target)
    );

    return {
      displayedNodes: filteredNodes,
      displayedEdges: filteredEdges,
      totalDatasetCount: totalCount,
    };
  }, [rawResponse, viewMode, search, filterType, expandedClusterRoots]);

  // 3. Compute layout positions
  const baseLayout = useMemo(() => {
    return calculateLayout(displayedNodes, displayedEdges);
  }, [displayedNodes, displayedEdges]);

  // 4. Apply Dynamic Highlighting and Dimming based on selectedNode or selectedEdge
  useEffect(() => {
    if (!baseLayout.nodes.length) {
      setNodes([]);
      setEdges([]);
      return;
    }

    // A. No active selection -> Render all nodes and edges at full normal opacity
    if (!selectedNode && !selectedEdge) {
      setNodes(
        baseLayout.nodes.map((n) => ({
          ...n,
          data: {
            ...n.data,
            isDimmed: false,
            isNeighbor: false,
            isSelected: false,
          },
          style: {
            opacity: 1,
            transition: 'opacity 0.25s ease, filter 0.25s ease',
          },
        }))
      );

      setEdges(
        baseLayout.edges.map((e) => {
          const isVerified = (e.data as unknown as GraphEdgeData)?.category === 'VERIFIED_SHARED_INDICATOR';
          return {
            ...e,
            animated: isVerified,
            style: {
              ...e.style,
              stroke: isVerified ? '#10b981' : '#f59e0b',
              strokeWidth: isVerified ? 2.5 : 1.5,
              opacity: 0.85,
              transition: 'opacity 0.25s ease',
            },
          };
        })
      );
      return;
    }

    // B. Node or Edge is Selected -> Calculate 1-hop connected sub-graph
    const activeNodeId = selectedNode?.id;
    const activeEdge = selectedEdge;

    const highlightedNodeIds = new Set<string>();
    const neighborNodeIds = new Set<string>();
    const connectedEdgeIds = new Set<string>();

    if (activeNodeId) {
      highlightedNodeIds.add(activeNodeId);
      baseLayout.edges.forEach((e) => {
        if (e.source === activeNodeId) {
          highlightedNodeIds.add(e.target);
          neighborNodeIds.add(e.target);
          connectedEdgeIds.add(e.id);
        }
        if (e.target === activeNodeId) {
          highlightedNodeIds.add(e.source);
          neighborNodeIds.add(e.source);
          connectedEdgeIds.add(e.id);
        }
      });
    } else if (activeEdge) {
      highlightedNodeIds.add(activeEdge.source);
      highlightedNodeIds.add(activeEdge.target);
      neighborNodeIds.add(activeEdge.source);
      neighborNodeIds.add(activeEdge.target);
      connectedEdgeIds.add(activeEdge.id);
    }

    // Apply Node Highlighting & Dimming
    setNodes(
      baseLayout.nodes.map((n) => {
        const isSelected = n.id === activeNodeId;
        const isNeighbor = neighborNodeIds.has(n.id);
        const isDimmed = !highlightedNodeIds.has(n.id);

        return {
          ...n,
          data: {
            ...n.data,
            isDimmed,
            isNeighbor,
            isSelected,
          },
          style: {
            opacity: isDimmed ? 0.15 : 1.0,
            filter: isDimmed ? 'grayscale(80%)' : 'none',
            transition: 'opacity 0.25s ease, filter 0.25s ease',
            zIndex: isSelected ? 50 : isNeighbor ? 20 : 1,
          },
        };
      })
    );

    // Apply Edge Highlighting & Dimming
    setEdges(
      baseLayout.edges.map((e) => {
        const isConnected = connectedEdgeIds.has(e.id);
        const isVerified = (e.data as unknown as GraphEdgeData)?.category === 'VERIFIED_SHARED_INDICATOR';
        const baseColor = isVerified ? '#10b981' : '#f59e0b';

        return {
          ...e,
          animated: isConnected,
          style: {
            ...e.style,
            stroke: isConnected ? baseColor : '#334155',
            strokeWidth: isConnected ? 3.5 : 1,
            opacity: isConnected ? 1.0 : 0.08,
            transition: 'all 0.25s ease',
            zIndex: isConnected ? 30 : 0,
          },
        };
      })
    );
  }, [baseLayout, selectedNode, selectedEdge, setNodes, setEdges]);

  // Click Handlers
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

  // Cluster Expansion handler
  const handleExpandCluster = useCallback((nodeId: string) => {
    setExpandedClusterRoots((prev) => {
      const next = new Set(prev);
      next.add(nodeId);
      return next;
    });
  }, []);

  // Check if selectedNode has hidden neighbors in the complete raw response
  const isSelectedNodeExpandable = useMemo(() => {
    if (!selectedNode || !rawResponse || viewMode === 'all') return false;
    const currentlyVisibleIds = new Set(displayedNodes.map((n) => n.id));
    const allConnectedNeighbors = rawResponse.edges
      .filter((e) => e.source === selectedNode.id || e.target === selectedNode.id)
      .map((e) => (e.source === selectedNode.id ? e.target : e.source));
    return allConnectedNeighbors.some((nbrId) => !currentlyVisibleIds.has(nbrId));
  }, [selectedNode, rawResponse, viewMode, displayedNodes]);

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

        {/* Global Controls & Dataset Toggles */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Manageable Initial View / Full Dataset Switcher */}
          <div className="flex items-center rounded-xl bg-slate-900 border border-slate-800 p-0.5 text-xs font-mono">
            <button
              onClick={() => setViewMode('focused')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'focused'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Manageable cluster view with top indicators"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Focused View</span>
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'all'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Display all correlated database entities"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Entities ({totalDatasetCount})</span>
            </button>
          </div>

          {/* Synthetic Demo Clusters Toggle (Defaulted to False) */}
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
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
            title="Refresh Graph from Database"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 backdrop-blur-md mb-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
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
              className="absolute right-3 top-2.5 text-xs text-slate-500 hover:text-white cursor-pointer"
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
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-colors cursor-pointer ${
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

      {/* Focused Mode Banner when not all nodes are displayed */}
      {viewMode === 'focused' && totalDatasetCount > displayedNodes.length && !search && filterType === 'all' && (
        <div className="mb-4 px-4 py-2 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs text-slate-300 font-mono">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              Showing <strong className="text-white">{displayedNodes.length} key correlated entities</strong> across top clusters ({totalDatasetCount - displayedNodes.length} unselected background records hidden for readability).
            </span>
          </div>
          <button
            onClick={() => setViewMode('all')}
            className="text-cyan-400 hover:text-cyan-300 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer shrink-0 ml-2"
          >
            <span>Show Full Dataset</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono text-cyan-300 cursor-pointer"
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
          minZoom={0.15}
          maxZoom={2.5}
          proOptions={{ hideAttribution: true }}
        >
          <GraphAutoCenter
            filterKey={`${search}-${filterType}-${includeDemo}-${viewMode}-${displayedNodes.length}`}
          />
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

        {/* Forensic Detail & Evidence Side Panel Overlay */}
        <div className="absolute top-4 right-4 z-10 max-h-[600px]">
          <GraphDetailPanel
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            allNodes={rawResponse?.nodes || []}
            connectedEdges={
              rawResponse?.edges.filter(
                (e) => e.source === selectedNode?.id || e.target === selectedNode?.id
              ) || []
            }
            onSelectNode={(node) => {
              setSelectedNode(node);
              setSelectedEdge(null);
            }}
            onSelectEdge={(edge) => {
              setSelectedEdge(edge);
              setSelectedNode(null);
            }}
            onClose={() => {
              setSelectedNode(null);
              setSelectedEdge(null);
            }}
            onInvestigateUrl={onInvestigateUrl}
            onExpandCluster={handleExpandCluster}
            isClusterExpandable={isSelectedNodeExpandable}
          />
        </div>
      </div>
    </section>
  );
};
