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
 * Broadcasts operations with an explicit timeout and automatic fallback
 * to alternative RPC nodes if the active node hangs or throws network errors.
 */
export const broadcastWithFallback = async (ops: any[], privateKey: any, timeoutMs = 25000): Promise<any> => {
  const current = getActiveNode();
  const nodesToTry = [
    current,
    ...STEEM_NODES.filter(n => n !== current)
  ];

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

  throw lastError || new Error("All Steem RPC nodes failed during broadcast.");
};

/**
 * Calls a Steem RPC method with fallback to other nodes and retries
 */
export const callWithFallback = async (method: string, params: any, retriesPerNode = 2) => {
  let lastError: any = null;
  for (const node of STEEM_NODES) {
    for (let i = 0; i <= retriesPerNode; i++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);
      
      try {
        if (i > 0) {
          console.log(`Retrying ${method} on node ${node} (attempt ${i})...`);
        }
        
        const response = await fetch(node, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method,
            params,
            id: Date.now()
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.status === 429) {
          console.warn(`Node ${node} rate limited (429). Waiting...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.error) {
          // If it's a specific Steem error like "no such account", don't keep retrying other nodes
          const msg = data.error.message || "";
          if (msg.includes('No such') || msg.includes('not found') || msg.includes('Unknown method')) {
             throw new Error(msg || "Steem RPC error");
          }
          console.warn(`Node ${node} returned error:`, data.error);
          lastError = data.error;
          continue; 
        }
        return data.result;
      } catch (err: any) {
        clearTimeout(timeoutId);
        lastError = err;
        
        if (err.name === 'AbortError') {
          console.warn(`Node ${node} timed out`);
        } else if (err.message && (err.message.includes('No such') || err.message.includes('not found') || err.message.includes('Unknown method'))) {
          throw err;
        }
        
        console.warn(`Node ${node} failed (attempt ${i}):`, err);
        if (i === retriesPerNode) continue; 
        await new Promise(resolve => setTimeout(resolve, 1000 * i));
      }
    }
  }
  
  const errorMessage = lastError?.message || lastError || "Unknown error";
  throw new Error(`All Steem nodes failed. Last error: ${errorMessage}`);
};
