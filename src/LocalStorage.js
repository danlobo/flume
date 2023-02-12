export class LocalStorage {
  constructor() {
    this.storage = {};
  }
  async setItem(key, value) {
    this.storage[key] = JSON.stringify(value);
  }
  async getItem(key) {
    return this.storage[key] ? JSON.parse(this.storage[key]) : null;
  }
  async removeItem(key) {
    delete this.storage[key];
  }
}
