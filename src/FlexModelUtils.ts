import { Model, TabNode, TabSetNode, IJsonModel, Action, Actions, Node as FLNode, DockLocation } from 'flexlayout-react';



export interface IAnalyzedModel {
    model: Model,
    activeTabset: FLNode | undefined,
    firstTabset: FLNode | undefined,
    widthNeeded?: number,
    heightNeeded?: number
}

export const analyseModel = (modelToAnalyse: Model): IAnalyzedModel => {

    let firstTabset: TabSetNode | undefined = undefined;
    let activeTabset: TabSetNode | undefined = undefined;

    console.log("doign analysis");
    // find the tabset that is currently active, and also the first tabset (as fallback)
    modelToAnalyse.visitNodes(node => {
        if (!firstTabset && node.getType().toLowerCase() === 'tabset') firstTabset = node as TabSetNode;

        if (!activeTabset && node.getType().toLowerCase() === 'tabset' && (node as TabSetNode).isActive()) {
            activeTabset = node as TabSetNode;
        }
    });


    return {
        model: modelToAnalyse,
        activeTabset: activeTabset,
        firstTabset: firstTabset
    }
}



export const stackZAxis = (analyzedModel: IAnalyzedModel): IAnalyzedModel => {

    let targetTabset: FLNode = analyzedModel.activeTabset ? analyzedModel.activeTabset : analyzedModel.firstTabset!;
    let tabsToMove: FLNode[] = [];

    analyzedModel.model.visitNodes((node) => {
        if (node.getType().toLowerCase() === 'tab' && node.getParent()?.getId() != targetTabset!.getId()) {
            tabsToMove.push(node);
        }
    });

    tabsToMove.forEach(node => {
        let mv = Actions.moveNode(node.getId(), targetTabset?.getId(), DockLocation.CENTER, -1);
        analyzedModel.model.doAction(mv);
    })


    return analyseModel(analyzedModel.model);
}

