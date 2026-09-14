import { JSDOM } from 'jsdom';

const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`);
(global as any).window = dom.window;
(global as any).document = dom.window.document;

console.log('Test environment initialized.');
