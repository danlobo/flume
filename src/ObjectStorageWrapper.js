export class ObjectStorageWrapper {
  constructor(storage) {
    this.storage = storage;
  }
  setItem(key, value) {
    this.storage.setItem(key, JSON.stringify(value));
  }
  getItem(key) {
    return JSON.parse(this.storage.getItem(key));
  }
  removeItem(key) {
    this.storage.removeItem(key);
  }
}
