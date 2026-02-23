import ELK from 'elkjs/lib/elk.bundled.js';

const elk = new ELK();

const graph = {
  id: 'root',
  layoutOptions: {
    'elk.algorithm': 'layered',
    'elk.direction': 'DOWN',
    'elk.edgeRouting': 'ORTHOGONAL',
    'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
    'json.edgeCoords': 'ROOT',
    'elk.layered.spacing.nodeNodeBetweenLayers': '68',
    'elk.spacing.nodeNode': '51',
    'elk.layered.spacing.edgeEdgeBetweenLayers': '16',
    'elk.layered.spacing.edgeNodeBetweenLayers': '24',
    'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
  },
  children: [
    // === Compound: client ===
    {
      id: 'client',
      layoutOptions: {
        'elk.padding': 'top=40,left=12,bottom=12,right=12',
      },
      width: 200,
      height: 150,
      children: [
        { id: 'client#admin', width: 160, height: 36 },
        { id: 'client#member', width: 160, height: 36 },
        { id: 'client#can_read_ip_owner', width: 180, height: 36 },
      ],
      edges: [
        // Intra-compound edge: admin -> can_read_ip_owner
        {
          id: 'e-intra-client-admin-to-can_read',
          sources: ['client#admin'],
          targets: ['client#can_read_ip_owner'],
        },
        // Intra-compound edge: member -> can_read_ip_owner
        {
          id: 'e-intra-client-member-to-can_read',
          sources: ['client#member'],
          targets: ['client#can_read_ip_owner'],
        },
      ],
    },

    // === Compound: ip_owner ===
    {
      id: 'ip_owner',
      layoutOptions: {
        'elk.padding': 'top=40,left=12,bottom=12,right=12',
      },
      width: 200,
      height: 150,
      children: [
        { id: 'ip_owner#client', width: 160, height: 36 },
        { id: 'ip_owner#can_read', width: 160, height: 36 },
        { id: 'ip_owner#can_update', width: 160, height: 36 },
      ],
      edges: [
        // Intra-compound edge: client -> can_read
        {
          id: 'e-intra-ip_owner-client-to-can_read',
          sources: ['ip_owner#client'],
          targets: ['ip_owner#can_read'],
        },
      ],
    },

    // === Compound: user ===
    {
      id: 'user',
      layoutOptions: {
        'elk.padding': 'top=40,left=12,bottom=12,right=12',
      },
      width: 200,
      height: 100,
      children: [
        { id: 'user#client', width: 160, height: 36 },
        { id: 'user#can_read', width: 160, height: 36 },
      ],
      edges: [],
    },
  ],

  // === Cross-compound edges (defined at root level) ===
  edges: [
    // High-fanout TTU: client#can_read_ip_owner -> targets in ip_owner
    {
      id: 'e-cross-client-can_read_ip_owner-TO-ip_owner-can_read',
      sources: ['client#can_read_ip_owner'],
      targets: ['ip_owner#can_read'],
    },
    {
      id: 'e-cross-client-can_read_ip_owner-TO-ip_owner-can_update',
      sources: ['client#can_read_ip_owner'],
      targets: ['ip_owner#can_update'],
    },
    {
      id: 'e-cross-client-can_read_ip_owner-TO-ip_owner-client',
      sources: ['client#can_read_ip_owner'],
      targets: ['ip_owner#client'],
    },

    // Cross-compound: user#client -> targets in other compounds
    {
      id: 'e-cross-user-client-TO-client-admin',
      sources: ['user#client'],
      targets: ['client#admin'],
    },
    {
      id: 'e-cross-user-client-TO-client-member',
      sources: ['user#client'],
      targets: ['client#member'],
    },
    {
      id: 'e-cross-user-client-TO-ip_owner-client',
      sources: ['user#client'],
      targets: ['ip_owner#client'],
    },

    // Cross-compound: user#can_read -> ip_owner#can_read
    {
      id: 'e-cross-user-can_read-TO-ip_owner-can_read',
      sources: ['user#can_read'],
      targets: ['ip_owner#can_read'],
    },
  ],
};

async function main() {
  console.log('=== ELK Hierarchical Layout Test ===\n');
  console.log('Layout options:');
  console.log('  algorithm: layered');
  console.log('  direction: DOWN');
  console.log('  edgeRouting: ORTHOGONAL');
  console.log('  hierarchyHandling: INCLUDE_CHILDREN');
  console.log('  json.edgeCoords: ROOT\n');

  const result = await elk.layout(graph);

  // Collect ALL edges from the result (root + nested in compounds)
  const allEdges = [];

  // Root-level edges (cross-compound)
  if (result.edges) {
    for (const edge of result.edges) {
      allEdges.push({ ...edge, location: 'root (cross-compound)' });
    }
  }

  // Edges nested in compound nodes (intra-compound)
  if (result.children) {
    for (const compound of result.children) {
      if (compound.edges) {
        for (const edge of compound.edges) {
          allEdges.push({ ...edge, location: `inside "${compound.id}" (intra-compound)` });
        }
      }
    }
  }

  console.log(`Total edges found: ${allEdges.length}\n`);
  console.log('='.repeat(100));

  // Track stats
  const stats = {
    crossCompound: { total: 0, noSections: 0, straightLine: 0, routed: 0, totalBends: 0 },
    intraCompound: { total: 0, noSections: 0, straightLine: 0, routed: 0, totalBends: 0 },
  };

  for (const edge of allEdges) {
    const isCross = edge.location.includes('cross-compound');
    const bucket = isCross ? stats.crossCompound : stats.intraCompound;
    bucket.total++;

    const sections = edge.sections || [];
    const sectionCount = sections.length;

    console.log(`\nEdge: ${edge.id}`);
    console.log(`  Location: ${edge.location}`);
    console.log(`  Sections: ${sectionCount}`);

    if (sectionCount === 0) {
      console.log('  *** WARNING: 0 sections — no routing data! ***');
      bucket.noSections++;
      continue;
    }

    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];
      const bendPoints = sec.bendPoints || [];
      const totalPoints = 2 + bendPoints.length; // start + bends + end

      console.log(`  Section ${i}:`);
      console.log(`    Start:  (${sec.startPoint.x.toFixed(1)}, ${sec.startPoint.y.toFixed(1)})`);

      if (bendPoints.length > 0) {
        for (let j = 0; j < bendPoints.length; j++) {
          console.log(`    Bend ${j}: (${bendPoints[j].x.toFixed(1)}, ${bendPoints[j].y.toFixed(1)})`);
        }
        bucket.totalBends += bendPoints.length;
        bucket.routed++;
      } else {
        console.log('    Bends:  NONE (straight line)');
        bucket.straightLine++;
      }

      console.log(`    End:    (${sec.endPoint.x.toFixed(1)}, ${sec.endPoint.y.toFixed(1)})`);
      console.log(`    Total points: ${totalPoints}`);

      // Check if it's truly orthogonal (only horizontal or vertical segments)
      const allPoints = [sec.startPoint, ...bendPoints, sec.endPoint];
      let isOrthogonal = true;
      for (let j = 1; j < allPoints.length; j++) {
        const dx = Math.abs(allPoints[j].x - allPoints[j - 1].x);
        const dy = Math.abs(allPoints[j].y - allPoints[j - 1].y);
        if (dx > 0.5 && dy > 0.5) {
          isOrthogonal = false;
          break;
        }
      }
      console.log(`    Orthogonal: ${isOrthogonal ? 'YES' : 'NO (diagonal segments!)'}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(100));
  console.log('\n=== SUMMARY ===\n');

  console.log('CROSS-COMPOUND edges:');
  console.log(`  Total: ${stats.crossCompound.total}`);
  console.log(`  No sections (no routing): ${stats.crossCompound.noSections}`);
  console.log(`  Straight lines (0 bends): ${stats.crossCompound.straightLine}`);
  console.log(`  Properly routed (1+ bends): ${stats.crossCompound.routed}`);
  console.log(`  Avg bends per routed edge: ${stats.crossCompound.routed > 0 ? (stats.crossCompound.totalBends / stats.crossCompound.routed).toFixed(1) : 'N/A'}`);

  console.log('\nINTRA-COMPOUND edges:');
  console.log(`  Total: ${stats.intraCompound.total}`);
  console.log(`  No sections (no routing): ${stats.intraCompound.noSections}`);
  console.log(`  Straight lines (0 bends): ${stats.intraCompound.straightLine}`);
  console.log(`  Properly routed (1+ bends): ${stats.intraCompound.routed}`);
  console.log(`  Avg bends per routed edge: ${stats.intraCompound.routed > 0 ? (stats.intraCompound.totalBends / stats.intraCompound.routed).toFixed(1) : 'N/A'}`);

  // Verdict
  console.log('\n=== VERDICT ===\n');
  if (stats.crossCompound.noSections > 0 || stats.crossCompound.straightLine > 0) {
    const problemCount = stats.crossCompound.noSections + stats.crossCompound.straightLine;
    console.log(`PROBLEM DETECTED: ${problemCount}/${stats.crossCompound.total} cross-compound edges lack proper orthogonal routing.`);
    if (stats.crossCompound.noSections > 0) {
      console.log(`  - ${stats.crossCompound.noSections} edges have NO sections at all (ELK returned no routing data)`);
    }
    if (stats.crossCompound.straightLine > 0) {
      console.log(`  - ${stats.crossCompound.straightLine} edges are straight lines (only start+end, no bends)`);
    }
    console.log('  => The issue is in ELK\'s routing output, not post-processing.');
  } else {
    console.log('ALL cross-compound edges have proper orthogonal routing with bend points.');
    console.log('  => If edges look wrong in the app, the issue is in post-processing (elk-path.ts).');
  }

  // Also dump the raw JSON of one cross-compound and one intra-compound edge for comparison
  console.log('\n=== RAW EDGE JSON (one of each) ===\n');
  const crossEdge = allEdges.find(e => e.location.includes('cross-compound'));
  const intraEdge = allEdges.find(e => e.location.includes('intra-compound'));

  if (crossEdge) {
    console.log('Cross-compound edge (raw):');
    const { location, ...raw } = crossEdge;
    console.log(JSON.stringify(raw, null, 2));
  }
  if (intraEdge) {
    console.log('\nIntra-compound edge (raw):');
    const { location, ...raw } = intraEdge;
    console.log(JSON.stringify(raw, null, 2));
  }
}

main().catch(console.error);
