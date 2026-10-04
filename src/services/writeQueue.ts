type WriteTask<T> = () => Promise<T>;

class WriteQueue {
  private current: Promise<unknown> = Promise.resolve();
  private running = false;

  get isRunning(): boolean {
    return this.running;
  }

  enqueue<T>(task: WriteTask<T>): Promise<T> {
    const run = this.current.then(async () => {
      this.running = true;
      try {
        return await task();
      } finally {
        this.running = false;
      }
    });

    this.current = run.catch(() => undefined);
    return run;
  }
}

export const writeQueue = new WriteQueue();
