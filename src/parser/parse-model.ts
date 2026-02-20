import { transformer } from "@openfga/syntax-transformer";
import type {
  AuthorizationNode,
  AuthorizationEdge,
  AuthorizationGraph,
  RewriteRule,
} from "../types";

// ─── OpenFGA JSON schema shapes ─────────────────────────────────────────────

interface Userset {
  this?: Record<string, never>;
  computedUserset?: { relation: string };
  tupleToUserset?: {
    computedUserset: { relation: string };
    tupleset: { relation: string };
  };
  union?: { child: Userset[] };
  intersection?: { child: Userset[] };
  difference?: { base: Userset; subtract: Userset };
}

interface TypeRestriction {
  type: string;
  relation?: string;
  wildcard?: Record<string, never>;
  condition?: string;
}

interface RelationMetadata {
  directly_related_user_types?: TypeRestriction[];
}

interface TypeDefinition {
  type: string;
  relations?: Record<string, Userset>;
  metadata?: { relations?: Record<string, RelationMetadata> } | null;
}

interface ParsedAuthorizationModel {
  schema_version: string;
  type_definitions: TypeDefinition[];
}

// ─── Userset traversal ──────────────────────────────────────────────────────

/** Flatten union / intersection / difference to leaf usersets */
function flattenRewriteRules(userset: Userset): Userset[] {
  if (userset.union) return userset.union.child.flatMap(flattenRewriteRules);
  if (userset.intersection)
    return userset.intersection.child.flatMap(flattenRewriteRules);
  if (userset.difference)
    return [
      ...flattenRewriteRules(userset.difference.base),
      ...flattenRewriteRules(userset.difference.subtract),
    ];
  return [userset];
}

/** Reconstruct a human-readable expression from the userset JSON tree */
function expressionFromUserset(
  userset: Userset,
  relationName: string,
  metadata: Record<string, RelationMetadata>,
): string {
  if (userset.this) {
    const restrictions =
      metadata[relationName]?.directly_related_user_types ?? [];
    const parts = restrictions.map((r) => {
      if (r.wildcard) return `[${r.type}:*]`;
      if (r.relation) return `[${r.type}#${r.relation}]`;
      return `[${r.type}]`;
    });
    return parts.join(", ") || "[this]";
  }
  if (userset.computedUserset) {
    return userset.computedUserset.relation;
  }
  if (userset.tupleToUserset) {
    const { computedUserset, tupleset } = userset.tupleToUserset;
    return `${computedUserset.relation} from ${tupleset.relation}`;
  }
  if (userset.union) {
    return userset.union.child
      .map((c) => expressionFromUserset(c, relationName, metadata))
      .join(" or ");
  }
  if (userset.intersection) {
    return userset.intersection.child
      .map((c) => expressionFromUserset(c, relationName, metadata))
      .join(" and ");
  }
  if (userset.difference) {
    const base = expressionFromUserset(
      userset.difference.base,
      relationName,
      metadata,
    );
    const sub = expressionFromUserset(
      userset.difference.subtract,
      relationName,
      metadata,
    );
    return `${base} but not ${sub}`;
  }
  return "";
}

// ─── Graph builder ──────────────────────────────────────────────────────────

function relationNodeId(typeName: string, relation: string): string {
  return `${typeName}#${relation}`;
}

function isPermissionRelation(relation: string): boolean {
  return relation.startsWith("can_");
}

/**
 * Parse an OpenFGA DSL string into an authorization graph.
 *
 * Node = (type, relation) pair.
 * Edge = userset rewrite dependency:
 *   source (the dependency) → target (the relation being defined).
 */
export function buildAuthorizationGraph(dsl: string): AuthorizationGraph {
  const model = transformer.transformDSLToJSONObject(
    dsl,
  ) as ParsedAuthorizationModel;
  const allTypeNames = new Set(model.type_definitions.map((t) => t.type));

  const nodeMap = new Map<string, AuthorizationNode>();
  const edgeList: AuthorizationEdge[] = [];
  let edgeSeq = 0;

  const ensureTypeNode = (typeName: string) => {
    if (!nodeMap.has(typeName)) {
      nodeMap.set(typeName, {
        id: typeName,
        type: typeName,
        kind: "type",
        isPermission: false,
        targets: [],
      });
    }
  };

  const ensureRelationNode = (
    typeName: string,
    relation: string,
    definition?: string,
  ) => {
    const id = relationNodeId(typeName, relation);
    if (!nodeMap.has(id)) {
      nodeMap.set(id, {
        id,
        type: typeName,
        relation,
        kind: "relation",
        isPermission: isPermissionRelation(relation),
        definition,
        targets: [],
      });
    }
  };

  const addEdge = (
    source: string,
    target: string,
    rewriteRule: RewriteRule,
    label?: string,
    tuplesetRelation?: string,
  ) => {
    edgeList.push({
      id: `e-${edgeSeq++}`,
      source,
      target,
      rewriteRule,
      label,
      tuplesetRelation,
    });
    const targetNode = nodeMap.get(target);
    if (targetNode && !targetNode.targets.includes(source)) {
      targetNode.targets.push(source);
    }
  };

  for (const typeDef of model.type_definitions) {
    const typeName = typeDef.type;
    const metadata: Record<string, RelationMetadata> =
      typeDef.metadata?.relations ?? {};
    const relations = typeDef.relations ?? {};

    ensureTypeNode(typeName);

    for (const [relName, userset] of Object.entries(relations)) {
      const definition = expressionFromUserset(userset, relName, metadata);
      ensureRelationNode(typeName, relName, definition);
      const targetId = relationNodeId(typeName, relName);

      const leaves = flattenRewriteRules(userset);

      for (const leaf of leaves) {
        // ── Direct type restrictions ──
        if (leaf.this) {
          const restrictions =
            metadata[relName]?.directly_related_user_types ?? [];
          for (const r of restrictions) {
            if (!allTypeNames.has(r.type)) continue;
            if (r.wildcard) continue;
            if (r.relation) {
              const sourceId = relationNodeId(r.type, r.relation);
              ensureRelationNode(r.type, r.relation);
              addEdge(sourceId, targetId, "direct");
            } else {
              ensureTypeNode(r.type);
              addEdge(r.type, targetId, "direct");
            }
          }
        }

        // ── Computed userset (same-type relation reference) ──
        if (leaf.computedUserset) {
          const depRelation = leaf.computedUserset.relation;
          const sourceId = relationNodeId(typeName, depRelation);
          ensureRelationNode(typeName, depRelation);
          addEdge(sourceId, targetId, "computed");
        }

        // ── Tuple-to-userset ──
        if (leaf.tupleToUserset) {
          const { computedUserset, tupleset } = leaf.tupleToUserset;
          const tuplesetRel = tupleset.relation;
          const rewrittenRel = computedUserset.relation;
          const tuplesetMeta = metadata[tuplesetRel];
          const parentTypes =
            tuplesetMeta?.directly_related_user_types?.filter(
              (r) => !r.wildcard,
            ) ?? [];

          for (const parent of parentTypes) {
            if (!allTypeNames.has(parent.type)) continue;
            const sourceId = relationNodeId(parent.type, rewrittenRel);
            ensureRelationNode(parent.type, rewrittenRel);
            addEdge(
              sourceId,
              targetId,
              "ttu",
              `from ${tuplesetRel}`,
              tuplesetRel,
            );
          }
        }
      }
    }
  }

  // Connect relation nodes to their parent type node for grouping context
  for (const node of nodeMap.values()) {
    if (node.kind === "relation") {
      ensureTypeNode(node.type);
    }
  }

  return {
    nodes: Array.from(nodeMap.values()),
    edges: edgeList,
  };
}
