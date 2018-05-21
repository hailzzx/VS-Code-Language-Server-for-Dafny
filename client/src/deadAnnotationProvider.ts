"use strict";
import * as vscode from "vscode";

export class DeadAnnotationResult {
    public success: boolean;
    public replacement: string;
    public line: number;
    public col: number;
    public length: number;
}

/**
 * class for handling requests to cehck for dead annotations and for reporting results
 */
export class DeadAnnotationProvider implements vscode.CodeActionProvider {

    private results: { [filename: string]: DeadAnnotationResult[] } = {};

    /**
     * Provide commands for the given document and range.
     * @param document The document in which the command was invoked.
     * @param range The range for which the command was invoked.
     * @param _ context Context carrying additional information. (unused)
     * @param token A cancellation token.
     */
    public provideCodeActions(document: vscode.TextDocument,
        actionRange: vscode.Range,
         _: vscode.CodeActionContext,
         token: vscode.CancellationToken):
         vscode.ProviderResult<vscode.Command[]> {
        const filename = vscode.Uri.file(document.fileName).toString();
        if(!this.results[filename]){
            return null;
        }
        const commandList: vscode.Command[] = [];
        const resultsForFile = this.results[filename];
        resultsForFile.forEach(result => {
            if(token.isCancellationRequested){return null;}
            const editStartPos = new vscode.Position(result.line-1, result.col-1);
            const editEndPos = editStartPos.translate(0, result.length);
            const editRange = new vscode.Range(editStartPos, editEndPos);
            if(actionRange.contains(editRange)){
                const workspaceEdit = new vscode.WorkspaceEdit();
                workspaceEdit.replace(vscode.Uri.file(document.fileName), editRange, result.replacement);
                const codeAction = new vscode.CodeAction(
                    "Fix Dead Annotations",
                    vscode.CodeActionKind.QuickFix
                )
                codeAction.edit = workspaceEdit;
                commandList.push(codeAction);
            }
        });
        if(token.isCancellationRequested){return null;}
        return commandList;
    }

    constructor(){ }

    /**
     * Handle response from langauge server
     * @param docPathName File checked
     * @param json list of dead annotation replacements found
     */
    public handleResponse(docPathName: string, result: DeadAnnotationResult[]){
        if(result.length == 0){
            return;
        }
        if(!result[0].success){
            vscode.window.showErrorMessage(`Failed to check for dead annotations: ${result[0].replacement}`);
            return;
        }
        this.results[docPathName] = result;
    }

    /**
     *
     */
}