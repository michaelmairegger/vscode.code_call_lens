// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { log } from 'util';
import * as webRequest from 'web-request';
import Settings = require("./settings");
import Sparkline = require("./sparkline");


class CallStackCommand implements vscode.Command {
  title: string;
  command: string;

  constructor(title: string, command: string) {
    this.title = title;
    this.command = command;
  }
}

abstract class CodeCallsCodeLensProvider implements vscode.CodeLensProvider {
  abstract selector: vscode.DocumentSelector;

  abstract provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.CodeLens[] | Thenable<vscode.CodeLens[]>;

  resolveCodeLens(codeLens: vscode.CodeLens, token: vscode.CancellationToken):
    vscode.CodeLens | Thenable<vscode.CodeLens> {
    if (codeLens instanceof CallStackLens && codeLens) {
      codeLens.command = new CallStackCommand(codeLens.method, "");

      return new Promise<vscode.CodeLens>(async (resolve, reject) => {
        if (codeLens.command) {

          var query = Settings.getHostname() + "/api/read?" +
            "source=" + Settings.pluginGuid + "&" +
            "days=" + Settings.getDateInterval() + "&" +
            "bars=" + String(Settings.getNumberOfBars()) + "&" +
            "predicate=1&" +
            "subject=" + encodeURIComponent(codeLens.method) + "&" +
            "topic=" + Settings.getTopic();

          try {
            var json = await webRequest.json<any>(query);

            if (json === null) {
              codeLens.command.title = "There was no response from the server.";
            }
            else {
              codeLens.command.title = String(json.number_of_calls) + (json.count === 1 ? " call" : " calls") + " in the last " + Settings.getDateInterval() + " days";
              codeLens.command.title += Sparkline.get(json.history);
            }
            resolve(codeLens);

          } catch (e) {
            log(e);

            codeLens.command.title = "The following error occurred: " + String(e);
            resolve(codeLens);
          }
        } else {
          reject(codeLens);
        }
      });
    }
    return Promise.reject<vscode.CodeLens>(codeLens);
  }
}

abstract class RegexCodeLensProvider extends CodeCallsCodeLensProvider {
  //important to have the method name on regex group #1
  abstract regExpMethod: RegExp;
  //important to have the module name on regex group #1
  abstract regExpModule: RegExp;
  //important to have the class name on regex group #1
  abstract regExpClass: RegExp;

  getClassesOrModules(regex: RegExp, document: vscode.TextDocument, token: vscode.CancellationToken): IdentifierHelper[] {
    let ret: IdentifierHelper[] = [];
    let match;

    while (match = regex.exec(document.getText())) {
      var group = match[1];
      const startPos = document.positionAt(match.index);
      const endPos = document.positionAt(match.index + match[0].length);
      ret.push(new IdentifierHelper(group, new vscode.Range(startPos, endPos)));
    }
    return ret;
  }

  provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken):
    vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
    const text = document.getText();
    let match;
    let ret: vscode.CodeLens[] = [];

    if (Settings.getIsEnabled()) {
      var modules = this.getClassesOrModules(this.regExpModule, document, token);
      var classes = this.getClassesOrModules(this.regExpClass, document, token);

      while (match = this.regExpMethod.exec(text)) {
        const startPos = document.positionAt(match.index);
        const endPos = document.positionAt(match.index + match[0].length);

        var methodName = match[1];
        var module = this.getNearestModuleOrClass(startPos, modules);
        var currentClass = this.getNearestModuleOrClass(startPos, classes);
        var fullQualifiedName = module + currentClass + methodName;

        ret.push(new CallStackLens(new vscode.Range(startPos, endPos), fullQualifiedName));
      }
    }

    return ret;
  }

  getNearestModuleOrClass(position: vscode.Position, modules: IdentifierHelper[]): string {
    for (let index = modules.length - 1; index >= 0; index--) {
      if (modules[index].range.start.isBeforeOrEqual(position)) {
        return modules[index].name + ".";
      }
    }
    return "";
  }
}

class IdentifierHelper {
  name: string;
  range: vscode.Range;

  constructor(name: string, range: vscode.Range) {
    this.name = name;
    this.range = range;
  }
}

class CallStackLens extends vscode.CodeLens {
  method: string;
  calls: number;

  constructor(range: vscode.Range, method: string) {
    super(range);

    this.method = method;
    this.calls = 0;
  }
}

class CsharpCodeLensProvider extends RegexCodeLensProvider {
  selector: vscode.DocumentSelector = { scheme: 'file', language: 'csharp' };
  regExpModule: RegExp = /namespace\s+([\w.]+)/g;
  regExpMethod: RegExp = /(?:public|protected|internal|private)(?:\s+async){0,1}(?:\s+(?:abstract|static|virtual|override|sealed))?\s+[\w+<>\[\]\s]+\s+([\w]+\([\w\s<>]*\))/g;
  regExpClass: RegExp = /(?:public|private|internal)\s+(?:abstract)\s+class\s+([\w<>]+)/g;
}

class ElixirCodeLensProvider extends RegexCodeLensProvider {
  selector: vscode.DocumentSelector = { scheme: 'file', language: 'elixir' };
  regExpMethod: RegExp = /def[p]?\s+((?:\w+)(?:\(.*\))?)\s*,?\s*do/g;
  regExpModule: RegExp = /defmodule\s+([\w.]+)\s+do/g;
  regExpClass: RegExp = /^$/g;
}

class JavaCodeLensProvider extends RegexCodeLensProvider {
  regExpModule: RegExp = /package\s+([\w.]+);/g;
  selector: vscode.DocumentSelector = { scheme: 'file', language: 'java' };
  regExpMethod: RegExp = /(?:public|protected|private|static|\s)+[\w<\>\[\]]+\s+([\w]+\s*(?:\w+)*\([^\)]*\))/g;
  regExpClass: RegExp = /(?:public|protected|private|static)\s*class\s+([\w.<>]+)/g;
}

export function activate(ctx: vscode.ExtensionContext): void {
  let lenses: CodeCallsCodeLensProvider[] = [
    new CsharpCodeLensProvider(),
    new JavaCodeLensProvider(),
    new ElixirCodeLensProvider(),
  ];

  lenses.forEach(element => {
    ctx.subscriptions.push(vscode.languages.registerCodeLensProvider(element.selector, element));
  });
}