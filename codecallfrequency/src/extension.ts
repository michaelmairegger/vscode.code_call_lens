'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as http from 'http';
import { log } from 'util';

class CallStackCommand implements vscode.Command {
    constructor(title: string, command: string) {
        this.title = title;
        this.command = command;
    }

    title: string;
    command: string;
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

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
class CustomCodeLensProvider implements vscode.CodeLensProvider {
    provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
        //(?:public|protected|internal|private)(\s+async){0,1}(?:\s+(?:abstract|static|virtual|override|sealed))?(?:\s+)(?<returnValue>\w+(?:<(?<genericReturnArguments>(?:\w+(?:\s*\,\s*)?)*)>)?)(?:\s+)(?<methodName>\w+)(?:<(?<genericMethodArguments>(?:\w+(?:\s*\,\s*)?)*)>)?\s*\((?<parameters>(?:\w+(?:<(?<generic3>(?:\w+(?:\s*\,\s*)?)*)>)?\s+\w*(?:\s*\,\s*)?)*)\)
        const regEx = /(?:public|protected|internal|private)(\s+async){0,1}(?:\s+(?:abstract|static|virtual|override|sealed))?(?:\s+)(\w+(?:<((?:\w+(?:\s*\,\s*)?)*)>)?)(?:\s+)(\w+)(?:<((?:\w+(?:\s*\,\s*)?)*)>)?\s*\(((?:\w+(?:<((?:\w+(?:\s*\,\s*)?)*)>)?\s+\w*(?:\s*\,\s*)?)*)\)/g;
        const text = document.getText();
        let match;

        let ret: vscode.CodeLens[] = [];

        while (match = regEx.exec(text)) {
            const startPos = document.positionAt(match.index);
            const endPos = document.positionAt(match.index + match[0].length);

            ret.push(new CallStackLens(new vscode.Range(startPos, endPos), match[0]));
        }

        return ret;
    }

    resolveCodeLens(codeLens: vscode.CodeLens, token: vscode.CancellationToken): vscode.CodeLens | Thenable<vscode.CodeLens> {
        if (codeLens instanceof CallStackLens && codeLens) {
            var callStackLens = codeLens as CallStackLens;
            callStackLens.command = new CallStackCommand("computing code calls", "");

            return new Promise<vscode.CodeLens>((resolve, reject) => {
                http.get(
                    "http://192.168.43.61:4000/api/read?predicate=1&subject=" + codeLens.method,
                    res => {
                        let content: string = "";

                        res.addListener("readable", () => {
                            var line = res.read();
                            if (line) {
                                content += line;
                            }
                        });


                        res.addListener("end",
                            () => {
                                if (codeLens.command) {
                                    try {
                                        var json = JSON.parse(content);
                                        log(codeLens.method);
                                        codeLens.command.title = json.result + " calls last 24 hours";
                                        resolve(codeLens);
                                        //this.onDidChangeCodeLenses()
                                    }
                                    catch (e) {
                                        log(e);
                                    }
                                }
                            });
                    });
            });

        }
        return Promise.reject<vscode.CodeLens>(codeLens);
    }
}

export function activate(ctx: vscode.ExtensionContext): void {
    ctx.subscriptions.push(vscode.languages.registerCodeLensProvider(['*'], new CustomCodeLensProvider()));
}