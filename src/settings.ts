import * as vscode from 'vscode';

class Settings {
  static pluginGuid: string = "3f79485f-0722-46c3-9d26-e728ffae80ae";

  static getTopic(): string {
    return vscode.workspace.getConfiguration().get<string>("code_call_lens.topic", "99f66761-d6c6-4100-840a-5ffa91c54349");
  }

  static getIsEnabled(): boolean {
    return vscode.workspace.getConfiguration().get<boolean>("code_call_lens.enabled", true);
  }

  static getHostname(): string | undefined {
    return vscode.workspace.getConfiguration().get<string>("code_call_lens.hostname");
  }

  static getDateInterval(): number {
    return vscode.workspace.getConfiguration().get<number>("code_call_lens.number_of_days", 30);
  }

  static isSparklineEnabled(): boolean {
    return vscode.workspace.getConfiguration().get<boolean>("code_call_lens.sparkline.enabled", true);
  }
  static getNumberOfBars(): number {
    if (!this.isSparklineEnabled()) {
      return 0;
    }

    var numberOfDays = this.getDateInterval();
    var barCount = vscode.workspace.getConfiguration().get<number>("code_call_lens.sparkline.number_of_bars", 15);

    return Math.min(numberOfDays, barCount);
  }
}

export = Settings;