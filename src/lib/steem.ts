import * as dsteem from '@blazeapps/dsteem';

export const STEEM_NODES = [
  'https://api.steemit.com',
  'https://api.justyy.com',
  'https://api.steemyy.com'
];

let activeNode = STEEM_NODES[0];
let lastProbe = 0;

export const getActiveNode = () => activeNode;
export const setActiveNode = (node: string) => {
  if (STEEM_NODES.includes(node)) {
    activeNode = node;
  }
};

/**
 * Побудова послідовної перевірки нод. Повертає першу робочу ноду.
 */
export const probeNodes = async (force = false) => {
  const now = Date.now();
  if (!force && now - lastProbe < 300000) return activeNode; // Перевірка кожні 5 хв

  for (const node of STEEM_NODES) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      
      const res = await fetch(node, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'condenser_api.get_dynamic_global_properties',
          params: [],
          id: 1
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data.result && data.result.head_block_number) {
          activeNode = node;
          lastProbe = now;
          return node;
        }
      }
    } catch (e) {
      console.warn(`Node ${node} probe failed:`, e);
    }
  }
  return activeNode;
};

export const getClient = (nodeOverride?: string) => {
  const node = nodeOverride || getActiveNode();
  try {
    const ClientClass = (dsteem as any).Client;
    if (ClientClass) {
      return new ClientClass(node, { timeout: 15000 });
    }
  } catch (err) {
    console.warn("Internal dsteem failed, fallback", err);
  }

  const dsteemExternal = (window as any).dsteem;
  if (!dsteemExternal) return null;
  return new dsteemExternal.Client(node, {
    timeout: 15000
  });
};

/**
 * Перевірка наявності або оновлення (редагування) допису/коментаря в блокчейні Steem за автором та permlink.
 * Якщо передано expectedBodySnippet, перевіряється, чи містить тіло допису на блокчейні нові дані.
 */
export const verifyPostOnChain = async (
  author: string, 
  permlink: string, 
  retries = 3, 
  delayMs = 1200,
  expectedBodySnippet?: string | null
): Promise<boolean> => {
  if (!author || !permlink) return false;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await callWithFallback('condenser_api.get_content', [author, permlink]);
      if (res && (res.id > 0 || (res.author === author && res.permlink === permlink && res.body && res.body.trim().length > 0))) {
        if (expectedBodySnippet && expectedBodySnippet.trim().length > 0) {
          const cleanSnippet = expectedBodySnippet.trim().substring(0, 80);
          if (res.body && res.body.includes(cleanSnippet)) {
            return true;
          }
        } else {
          return true;
        }
      }
    } catch (e) {
      console.warn(`[verifyPostOnChain] Attempt ${i + 1} failed:`, e);
    }
    if (i < retries - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  return false;
};

/**
 * Broadcasts operations with an explicit timeout and automatic fallback
 * to alternative RPC nodes if the active node hangs or throws network errors.
 */
export const broadcastWithFallback = async (ops: any[], privateKey: any, timeoutMs = 25000): Promise<any> => {
  const current = getActiveNode();
  const nodesToTry = [
    current,
    ...STEEM_NODES.filter(n => n !== current)
  ];

  // Extract author, permlink, and body snippet if payload contains a comment operation
  const commentOp = ops.find(op => Array.isArray(op) && op[0] === 'comment');
  const author = commentOp ? commentOp[1]?.author : null;
  const permlink = commentOp ? commentOp[1]?.permlink : null;
  const bodySnippet = commentOp ? commentOp[1]?.body : null;

  let lastError: any = null;

  for (const node of nodesToTry) {
    try {
      const client = getClient(node);
      if (!client) continue;

      let timer: any = null;
      const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`Broadcast timeout (${Math.round(timeoutMs / 1000)}s) on node: ${node}`));
        }, timeoutMs);
      });

      const broadcastPromise = client.broadcast.sendOperations(ops, privateKey);
      const res = await Promise.race([broadcastPromise, timeoutPromise]);
      if (timer) clearTimeout(timer);
      activeNode = node; // Update active node to the working one
      return res;
    } catch (err: any) {
      lastError = err;
      const msg = err?.message || '';

      // Check if post was actually created or edited on blockchain despite node error or timeout
      if (author && permlink) {
        console.warn(`[Steem Broadcast] Node ${node} broadcast warning/error: "${msg}". Verifying on blockchain...`);
        const verified = await verifyPostOnChain(author, permlink, 2, 1000, bodySnippet);
        if (verified) {
          console.log(`[Steem Broadcast] Post/edit @${author}/${permlink} verified on blockchain despite RPC node timeout!`);
          activeNode = node;
          return { success: true, verifiedOnChain: true, author, permlink };
        }
      }

      // Critical blockchain rejection errors that should not be retried across nodes
      if (
        msg.includes('missing required posting authority') ||
        msg.includes('missing required active authority') ||
        msg.includes('has already used that permlink') ||
        msg.includes('author is not found') ||
        msg.includes('You may only post once every') ||
        msg.includes('Invalid Posting Key') ||
        msg.includes('Account: @')
      ) {
        throw err;
      }
      console.warn(`Broadcast failed or timed out on node ${node}: ${msg}. Attempting next node...`);
    }
  }

  // Final verification check before throwing last error
  if (author && permlink) {
    console.warn(`[Steem Broadcast] All node attempts finished with errors. Performing final verification on blockchain...`);
    const verified = await verifyPostOnChain(author, permlink, 3, 1200, bodySnippet);
    if (verified) {
      console.log(`[Steem Broadcast] Post/edit @${author}/${permlink} verified on blockchain during final check!`);
      return { success: true, verifiedOnChain: true, author, permlink };
    }
  }

  throw lastError || new Error("All Steem RPC nodes failed during broadcast.");
};

export interface CallFallbackOptions {
  preferActiveNode?: boolean;
  retries?: number;
}

/**
 * Calls a Steem RPC method with automatic node failover.
 * - Default mode: competitive parallel race across nodes for fast single-item calls.
 * - `preferActiveNode`: queries the active node first and falls back sequentially to reduce
 *   redundant bandwidth load on weak mobile/slow internet connections during batch fetching.
 */
export const callWithFallback = async (
  method: string,
  params: any,
  timeoutMs = 25000,
  options?: CallFallbackOptions,
) => {
  // Bridge API (Hivemind) calls are supported exclusively on nodes running the bridge plugin (e.g. api.steemit.com)
  const isBridgeMethod = method.startsWith('bridge.');
  const baseNodes = isBridgeMethod
    ? STEEM_NODES.filter(n => n.includes('steemit.com'))
    : STEEM_NODES;

  const current = getActiveNode();
  const orderedNodes = baseNodes.includes(current)
    ? [current, ...baseNodes.filter(n => n !== current)]
    : baseNodes;

  const querySingleNode = async (node: string, signal: AbortSignal) => {
    const response = await fetch(node, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method,
        params,
        id: Date.now()
      }),
      signal
    });

    if (response.status === 429) {
      throw new Error(`Node ${node} rate limited (429)`);
    }

    if (!response.ok) {
      throw new Error(`Node ${node} HTTP error: ${response.status}`);
    }

    const data = await response.json();
    if (data.error) {
      const msg = data.error.message || "";
      // Only data-level errors (like 'No such account' or 'Post not found') are fatal to the operation
      const isFatal = msg.includes('No such') || msg.includes('not found') || msg.includes('Account name already exists');
      const err: any = new Error(msg || "Steem RPC error");
      err.isFatal = isFatal;
      err.steemError = data.error;
      throw err;
    }

    setActiveNode(node);
    return data.result;
  };

  if (options?.preferActiveNode) {
    const errors: any[] = [];
    for (const node of orderedNodes) {
      const controller = new AbortController();
      const timer = setTimeout(() => {
        if (!controller.signal.aborted) {
          controller.abort();
        }
      }, timeoutMs);
      try {
        const result = await querySingleNode(node, controller.signal);
        clearTimeout(timer);
        return result;
      } catch (err: any) {
        clearTimeout(timer);
        if (err?.isFatal) throw err;
        errors.push(err);
        console.warn(`[Steem RPC] Sequential attempt failed on ${node} (${method}):`, err?.message || err);
      }
    }
    const lastMsg = errors.map((e: any) => e?.message || String(e)).join('; ');
    throw new Error(`All Steem nodes failed for ${method}. Errors: ${lastMsg}`);
  }

  // Perform parallel race with configured timeout
  const executeParallelRace = async (nodes = orderedNodes): Promise<any> => {
    const controllers = nodes.map(() => new AbortController());
    const overallTimeoutId = setTimeout(() => {
      controllers.forEach(c => {
        if (!c.signal.aborted) {
          c.abort();
        }
      });
    }, timeoutMs);

    try {
      const nodePromises = nodes.map(async (node, index) => {
        const controller = controllers[index];
        const result = await querySingleNode(node, controller.signal);
        // Abort all competing requests immediately upon first successful result
        controllers.forEach((c, idx) => {
          if (idx !== index && !c.signal.aborted) {
            c.abort();
          }
        });
        return result;
      });

      return await Promise.any(nodePromises);
    } finally {
      clearTimeout(overallTimeoutId);
    }
  };

  try {
    return await executeParallelRace();
  } catch (firstWaveError: any) {
    const rawErrors = firstWaveError?.errors || [firstWaveError];
    const fatalErr = rawErrors.find((e: any) => e?.isFatal);
    if (fatalErr) {
      throw fatalErr;
    }

    const retryCount = options?.retries ?? 1;
    if (retryCount <= 0) {
      const lastMsg = rawErrors.map((e: any) => e?.message || String(e)).join('; ');
      throw new Error(`All Steem nodes failed for ${method}. Errors: ${lastMsg}`, { cause: firstWaveError });
    }

    // Perform one fallback retry wave if temporary network timeout occurred
    console.warn(`[Steem RPC] Retrying call ${method}...`);
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      return await executeParallelRace();
    } catch (secondWaveError: any) {
      const finalErrors = secondWaveError?.errors || [secondWaveError];
      const fatal = finalErrors.find((e: any) => e?.isFatal);
      if (fatal) throw fatal;
      const lastMsg = finalErrors.map((e: any) => e?.message || String(e)).join('; ');
      throw new Error(`All Steem nodes failed for ${method}. Errors: ${lastMsg}`, { cause: secondWaveError });
    }
  }
};
