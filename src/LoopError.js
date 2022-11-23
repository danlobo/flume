export class LoopError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
  static maxLoopsExceeded = 1;
}
