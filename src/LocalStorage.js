export class LocalStorage {
  constructor() {
    this.storage = {};
  }
  setItem(key, value) {
    this.storage[key] = JSON.stringify(value);
  }
  getItem(key) {
    return this.storage[key] ? JSON.parse(this.storage[key]) : null;
  }
  removeItem(key) {
    delete this.storage[key];
  }
}
