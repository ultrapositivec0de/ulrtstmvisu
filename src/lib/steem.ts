import { Client } from 'dsteem';

const STEEM_NODES = [
  'https://api.steemit.com',
  'https://api.justyy.com'

];

let activeNode = STEEM_NODES[0];
let client = new Client(activeNode);

export function getClient(): Client {
  if (!client) {
    client = new Client(activeNode);
  }
  return client;
}

export async function probeNodes(): Promise<string> {
  console.log("Probing Steem nodes...");
  let fastestNode = activeNode;
  let minLatency = Infinity;

  for (const node of STEEM_NODES) {
    const start = Date.now();
    try {
      const tempClient = new Client(node);
      await tempClient.database.getConfig();
      const latency = Date.now() - start;
      console.log(`Node ${node} latency: ${latency}ms`);
      if (latency < minLatency) {
        minLatency = latency;
        fastestNode = node;
      }
    } catch (e) {
      console.warn(`Node ${node} failed probe:`, e);
    }
  }

  activeNode = fastestNode;
  client = new Client(activeNode);
  console.log(`Setting active node to ${activeNode}`);
  return activeNode;
}

export async function callWithFallback<T = any>(method: string, params: any): Promise<T> {
  const nodes = [activeNode, ...STEEM_NODES.filter(n => n !== activeNode)];
  let lastError: any = null;

  for (const node of nodes) {
    try {
      const activeClient = new Client(node);
      
      const parts = method.split('.');
      const api = parts.length > 1 ? parts[0] : 'condenser_api';
      const actualMethod = parts.length > 1 ? parts[1] : method;
      
      const result = await activeClient.call(api, actualMethod, params);
      return result as T;
    } catch (e) {
      console.warn(`Call failed on node ${node}:`, e);
      lastError = e;
    }
  }

  throw lastError || new Error(`All nodes failed to execute method ${method}`);
}
