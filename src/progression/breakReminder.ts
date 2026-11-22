export class BreakReminder {
  private activeSeconds = 0;
  private shown = false;

  advance(seconds: number, minutes: number) {
    if (this.shown) return false;
    this.activeSeconds += seconds;
    if (this.activeSeconds < minutes * 60) return false;
    this.shown = true;
    return true;
  }
}
