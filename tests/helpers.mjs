export class MemoryStore {
  values = new Map();
  counter = 0;
  calls = [];
  async getWithMetadata(key) {
    this.calls.push(["getWithMetadata", key]);
    return structuredClone(this.values.get(key) || null);
  }
  async get(key) {
    this.calls.push(["get", key]);
    return structuredClone(this.values.get(key)?.data ?? null);
  }
  async setJSON(key, data, options = {}) {
    const old = this.values.get(key);
    if (
      (options.onlyIfNew && old) ||
      (options.onlyIfMatch && old?.etag !== options.onlyIfMatch)
    )
      return { modified: false };
    const etag = String(++this.counter);
    this.values.set(key, { data: structuredClone(data), etag });
    return { modified: true, etag };
  }
  async set(key, data, options = {}) {
    return this.setJSON(key, data, options);
  }
  async delete(key) {
    this.values.delete(key);
  }
}
