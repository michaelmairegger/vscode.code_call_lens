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

class Settings {
    static pluginGuid: string = "3f79485f-0722-46c3-9d26-e728ffae80ae";
    static isEnabled: boolean | undefined = vscode.workspace.getConfiguration().get<boolean>("code_call_lens.enabled");
    static hostname: string | undefined = vscode.workspace.getConfiguration().get<string>("code_call_lens.hostname");
    static granularity: number | undefined = vscode.workspace.getConfiguration().get<number>("code_call_lens.granularity");
}

class WebApi {
    static getData(methodName: string, predicate: number): string {

        var query = Settings.hostname + "/api/read_one?" +
            //"source=" + Settings.pluginGuid + "&" +
            //"granularity=" + Settings.granularity + "&" +
            "predicate=" + String(predicate) + "&" +
            "subject=" + methodName;

            return query;
    }
}

abstract class CodeCallsCodeLensProvider implements vscode.CodeLensProvider {

    abstract selector: vscode.DocumentSelector;
    abstract provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.CodeLens[] | Thenable<vscode.CodeLens[]>;

    resolveCodeLens(codeLens: vscode.CodeLens, token: vscode.CancellationToken): vscode.CodeLens | Thenable<vscode.CodeLens> {
        if (codeLens instanceof CallStackLens && codeLens) {
            codeLens.command = new CallStackCommand("loading code calls...", "");

            return new Promise<vscode.CodeLens>((resolve, reject) => {
                //resolve(codeLens);

                http.get(
                    WebApi.getData(codeLens.method, 1),
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

                                        if (json.result === null) {
                                            codeLens.command.title = "Never called";
                                        }
                                        else {
                                            codeLens.command.title = String(json.result.count) + (json.result.count === 1? " call" : " calls") + " in the last " + json.result.granularity + " days";
                                        }

                                        resolve(codeLens);
                                    }
                                    catch (e) {
                                        log(e);
                                    }
                                }
                            });
                    }).on("error", () => {
                        if (codeLens.command) {
                            codeLens.command.title = "Data server not available";
                            resolve(codeLens);
                        }
                    });
            });

        }
        return Promise.reject<vscode.CodeLens>(codeLens);
    }
}

abstract class RegexCodeLensProvider extends CodeCallsCodeLensProvider {

    abstract regEx: RegExp;

    provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
        const text = document.getText();
        let match;
        let ret: vscode.CodeLens[] = [];


        if (Settings.isEnabled) {
            while (match = this.regEx.exec(text)) {
                const startPos = document.positionAt(match.index);
                const endPos = document.positionAt(match.index + match[0].length);

                ret.push(new CallStackLens(new vscode.Range(startPos, endPos), match[0]));
            }
        }

        return ret;
    }
}

class CsharpCodeLensProvider extends RegexCodeLensProvider {
    selector: vscode.DocumentSelector = { scheme: 'file', language: 'csharp' };
    regEx: RegExp = /(?:public|protected|internal|private)(\s+async){0,1}(?:\s+(?:abstract|static|virtual|override|sealed))?(?:\s+)(\w+(?:<((?:\w+(?:\s*\,\s*)?)*)>)?)(?:\s+)(\w+)(?:<((?:\w+(?:\s*\,\s*)?)*)>)?\s*\(((?:\w+(?:<((?:\w+(?:\s*\,\s*)?)*)>)?\s+\w*(?:\s*\,\s*)?)*)\)/g;
}

class ElixirCodeLensProvider extends RegexCodeLensProvider {
    selector: vscode.DocumentSelector = { scheme: 'file', language: 'elixir' };
    regEx: RegExp = /def[p]?\s+(\w+)\(.*\)\s*,?\s*do/g;
}

class JavaCodeLensProvider extends RegexCodeLensProvider {
    selector: vscode.DocumentSelector = { scheme: 'file', language: 'java' };
    regEx: RegExp = /(public|protected|private|static|\s)+[\w\<\>\[\]]+\s+(\w+) *\([^\)]*\) *(\{?|[^;])/g;
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