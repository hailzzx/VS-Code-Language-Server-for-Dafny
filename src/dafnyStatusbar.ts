"use strict";
import { Strings } from "./stringRessources";
import * as vscode from "vscode";

import {VerificationResult} from "./VerificationResults";
import {VerificationRequest} from "./VerificationRequest";
import {Context} from "./Context";

class Priority {
    public static low: number = 1;
    public static medium: number = 5;
    public static high: number = 10;
}
export class Statusbar {

    private serverStatusBar: vscode.StatusBarItem = null;
    private currentDocumentStatucBar: vscode.StatusBarItem = null;

    private serverStatus: string;
    constructor(private context: Context) {
        this.currentDocumentStatucBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, Priority.high);
        this.serverStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, Priority.low);
    }

    private verificationResultToString(result: VerificationResult): string {
        let response: string = "";

        if(result.crashed) {
            return Strings.Crashed;
        }

        if(result.errorCount === 0) {
            response = Strings.Verified;
        } else {
            response = Strings.NotVerified;
        }
        response += " | Proof Obligations: " + result.proofObligations + " | Errors: " + result.errorCount + " | ";

        return response;
    }

    public hide(): void {
        this.serverStatusBar.hide();
        this.currentDocumentStatucBar.hide();
    }

    public remainingRequests(): number {
        return this.context.queue.size();
    }

    public update(): void  {
        const editor: vscode.TextEditor = vscode.window.activeTextEditor;
        const editorsOpen: number = vscode.window.visibleTextEditors.length;
        if (!editor || editorsOpen === 0 || editor.document.languageId !== "dafny") {
            this.serverStatusBar.hide();
            this.currentDocumentStatucBar.hide();
            return;
        }

        if(this.context.serverpid) {
            this.serverStatusBar.text = Strings.ServerUp;
            this.serverStatusBar.text += " (pid " + this.context.serverpid + ")";
            this.serverStatusBar.text += " | " + this.serverStatus + " | ";
            this.serverStatusBar.text += "Queue: " + this.remainingRequests() + " |";
        } else {
            this.serverStatusBar.text = Strings.ServerDown;
        }

        if (this.context.activeRequest && editor.document === this.context.activeRequest.document) {
            this.currentDocumentStatucBar.text = Strings.Verifying;
        } else if (this.queueContains(editor.document.fileName)) {
            this.currentDocumentStatucBar.text = Strings.Queued;
        } else {
            const res: undefined | VerificationResult = this.context.verificationResults.latestResults[editor.document.fileName];
            if (res !== undefined) {
                const displayText: string = this.verificationResultToString(res);
                this.currentDocumentStatucBar.text = displayText;
            }
        }
        this.serverStatusBar.show();
        this.currentDocumentStatucBar.show();
    }

    public changeServerStatus(status: string): void {
        this.serverStatus = status;
        this.update();
    }

    public setDocumentBar(text: string): void {
        this.currentDocumentStatucBar.text = text;
    }

    private queueContains(filename: string): boolean {
        let found: boolean = false;
        this.context.queue.forEach(function(request: VerificationRequest): void {
            if(request.document.fileName === filename) {
                found = true;
            }
        });
        return found;
    }

}